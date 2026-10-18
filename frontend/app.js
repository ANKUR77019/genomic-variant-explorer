const API_BASE = "https://genomic-variant-explorer.onrender.com";
const form = document.getElementById("search-form");
const geneInput = document.getElementById("gene");
const diseaseInput = document.getElementById("disease");
const searchButton = document.getElementById("search-button");
const clearButton = document.getElementById("clear-button");
const statusText = document.getElementById("status");
const resultCount = document.getElementById("result-count");
const resultsBody = document.getElementById("results");
const pagination = document.getElementById("pagination");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");
const pageInfo = document.getElementById("page-info");

let currentPage = 1;
let lastPages = 1;
let requestNumber = 0;

function addCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = value === null || value === undefined || value === ""
        ? "—"
        : String(value);
    row.appendChild(cell);
}

function showMessage(message) {
    resultsBody.replaceChildren();
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 9;
    cell.className = "empty-state";
    cell.textContent = message;
    row.appendChild(cell);
    resultsBody.appendChild(row);
}

function renderResults(items) {
    resultsBody.replaceChildren();

    if (!items.length) {
        showMessage("No matching variants found. Try another gene or disease.");
        return;
    }

    for (const variant of items) {
        const row = document.createElement("tr");
        const gene = variant.gene ||
            (variant.genes || []).map(item => item.symbol).join(", ");

        addCell(row, gene);
        addCell(row, variant.disease);
        addCell(row, variant.chromosome);
        addCell(row, variant.position);
        addCell(row, variant.ref);
        addCell(row, (variant.alt || []).join(", "));
        addCell(row, variant.clinical_significance);
        addCell(row, variant.review_status);
        addCell(row, variant.clinvar_id);
        resultsBody.appendChild(row);
    }
}

async function searchVariants(page = 1) {
    const gene = geneInput.value.trim();
    const disease = diseaseInput.value.trim();

    if (!gene && !disease) {
        statusText.textContent = "Enter a gene name or disease.";
        resultCount.textContent = "";
        pagination.hidden = true;
        showMessage("Enter a search term to find variants.");
        return;
    }

    const thisRequest = ++requestNumber;
    const params = new URLSearchParams({
        gene,
        disease,
        page: String(page),
        per_page: "20"
    });

    searchButton.disabled = true;
    statusText.textContent = "Searching database…";

    try {
        const response = await fetch(`${API_BASE}/search?${params.toString()}`);
        const data = await response.json();

        if (thisRequest !== requestNumber) return;

        if (!response.ok) {
            throw new Error(data.error || "Search failed.");
        }

        renderResults(data.results || []);
        currentPage = data.page;
        lastPages = Math.max(data.pages, 1);

        resultCount.textContent =
            `${data.total} matching variant${data.total === 1 ? "" : "s"}`;

        statusText.textContent = data.total
            ? `Showing ${data.total === 1 ? "the matching record" : "up to 20 records"} on this page.`
            : "Search completed.";

        pagination.hidden = data.total === 0;
        prevButton.disabled = currentPage <= 1;
        nextButton.disabled = currentPage >= lastPages;
        pageInfo.textContent = `Page ${currentPage} of ${lastPages}`;
    } catch (error) {
        if (thisRequest !== requestNumber) return;
        statusText.textContent = error.message || "Could not complete search.";
        resultCount.textContent = "";
        pagination.hidden = true;
        showMessage("Unable to retrieve results. Check that Flask and MongoDB are running.");
    } finally {
        if (thisRequest === requestNumber) {
            searchButton.disabled = false;
        }
    }
}

form.addEventListener("submit", event => {
    event.preventDefault();
    searchVariants(1);
});

clearButton.addEventListener("click", () => {
    requestNumber++;
    form.reset();
    currentPage = 1;
    lastPages = 1;
    statusText.textContent = "Enter a search term to begin.";
    resultCount.textContent = "";
    pagination.hidden = true;
    searchButton.disabled = false;
    showMessage("No search performed yet.");
});

prevButton.addEventListener("click", () => {
    if (currentPage > 1) searchVariants(currentPage - 1);
});

nextButton.addEventListener("click", () => {
    if (currentPage < lastPages) searchVariants(currentPage + 1);
});

/* Gene and disease autocomplete: suggestions come from MongoDB. */
(() => {
    const fields = [
        { input: geneInput, type: "gene" },
        { input: diseaseInput, type: "disease" }
    ];

    const widgets = [];

    for (const field of fields) {
        const input = field.input;
        const wrapper = input.parentElement;
        const list = document.createElement("div");

        list.className = "autocomplete-list";
        list.id = `${field.type}-suggestions`;
        list.setAttribute("role", "listbox");
        list.hidden = true;
        wrapper.appendChild(list);

        input.setAttribute("autocomplete", "off");
        input.setAttribute("aria-autocomplete", "list");
        input.setAttribute("aria-controls", list.id);
        input.setAttribute("aria-expanded", "false");

        widgets.push({
            ...field,
            list,
            items: [],
            activeIndex: -1,
            timer: null,
            requestId: 0
        });
    }

    function close(widget) {
        widget.list.hidden = true;
        widget.input.setAttribute("aria-expanded", "false");
        widget.input.removeAttribute("aria-activedescendant");
        widget.activeIndex = -1;
    }

    function choose(widget, value) {
        widget.input.value = value;
        close(widget);
        widget.input.focus();
    }

    function highlight(widget, index) {
        const options = [...widget.list.querySelectorAll("button")];
        if (!options.length) return;

        widget.activeIndex = (index + options.length) % options.length;
        options.forEach((option, i) => {
            option.classList.toggle("active", i === widget.activeIndex);
            option.setAttribute("aria-selected", String(i === widget.activeIndex));
        });

        widget.input.setAttribute(
            "aria-activedescendant",
            options[widget.activeIndex].id
        );
        options[widget.activeIndex].scrollIntoView({ block: "nearest" });
    }

    function render(widget, values, message = "") {
        widget.items = values;
        widget.activeIndex = -1;
        widget.list.replaceChildren();

        if (!values.length) {
            if (message) {
                const empty = document.createElement("div");
                empty.className = "autocomplete-empty";
                empty.textContent = message;
                widget.list.appendChild(empty);
            }
            widget.list.hidden = !message;
            widget.input.setAttribute("aria-expanded", String(Boolean(message)));
            return;
        }

        values.forEach((value, index) => {
            const option = document.createElement("button");
            option.type = "button";
            option.className = "autocomplete-option";
            option.id = `${widget.type}-option-${index}`;
            option.setAttribute("role", "option");
            option.setAttribute("aria-selected", "false");
            option.textContent = value;

            option.addEventListener("pointerdown", event => {
                // Select before the input loses focus.
                event.preventDefault();
                choose(widget, value);
            });

            widget.list.appendChild(option);
        });

        widget.list.hidden = false;
        widget.input.setAttribute("aria-expanded", "true");
    }

    async function load(widget) {
        const query = widget.input.value.trim();
        const requestId = ++widget.requestId;

        try {
            const params = new URLSearchParams({
                type: widget.type,
                q: query
            });
            const response = await fetch(`${API_BASE}/suggestions?${params}`);
            const data = await response.json();

            if (requestId !== widget.requestId) return;

            if (!response.ok) {
                render(widget, [], data.error || "Suggestions unavailable.");
                return;
            }

            render(
                widget,
                data.suggestions || [],
                query ? "No matching suggestions." : "No suggestions available."
            );
        } catch {
            if (requestId === widget.requestId) {
                render(widget, [], "Could not load suggestions. Check the database connection.");
            }
        }
    }

    for (const widget of widgets) {
        widget.input.addEventListener("focus", () => load(widget));

        widget.input.addEventListener("input", () => {
            clearTimeout(widget.timer);
            widget.timer = setTimeout(() => load(widget), 180);
        });

        widget.input.addEventListener("keydown", event => {
            if (event.key === "ArrowDown" && !widget.list.hidden) {
                event.preventDefault();
                highlight(widget, widget.activeIndex + 1);
            } else if (event.key === "ArrowUp" && !widget.list.hidden) {
                event.preventDefault();
                highlight(widget, widget.activeIndex - 1);
            } else if (
                event.key === "Enter" &&
                !widget.list.hidden &&
                widget.activeIndex >= 0
            ) {
                event.preventDefault();
                choose(widget, widget.items[widget.activeIndex]);
            } else if (event.key === "Escape") {
                close(widget);
            }
        });
    }

    document.addEventListener("click", event => {
        for (const widget of widgets) {
            if (!widget.input.parentElement.contains(event.target)) {
                close(widget);
            }
        }
    });

    clearButton.addEventListener("click", () => {
        for (const widget of widgets) {
            clearTimeout(widget.timer);
            widget.requestId++;
            close(widget);
        }
    });
})();
