/* =====================================================
   RECETARIO VICKY CAFÉ
   SISTEMA EN GRAMOS
===================================================== */


/* =====================================================
   DATOS
===================================================== */

const D = window.RECETARIO;

const app =
    document.getElementById("app");

const search =
    document.getElementById("search");

const title =
    document.getElementById("page-title");

const modal =
    document.getElementById("modal");

const modalContent =
    document.getElementById("modal-content");


/* =====================================================
   COPIA ORIGINAL
===================================================== */

window.RECETARIO_ORIGINAL =
    JSON.parse(
        JSON.stringify(D)
    );


/* =====================================================
   UTILIDADES
===================================================== */

function clone(object) {

    return JSON.parse(
        JSON.stringify(object)
    );

}


function norm(value) {

    return (value || "")
        .toString()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase();

}


function esc(value) {

    return (value ?? "")
        .toString()
        .replace(
            /[&<>'"]/g,
            character => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "'": "&#39;",
                '"': "&quot;"
            })[character]
        );

}


/* =====================================================
   MONEDA
===================================================== */

function money(value) {

    if (
        value === null ||
        value === undefined ||
        Number.isNaN(
            Number(value)
        )
    ) {

        return "—";

    }


    return new Intl.NumberFormat(
        "es-VE",
        {
            style: "currency",
            currency: "VES",
            maximumFractionDigits: 2
        }
    ).format(
        Number(value)
    );

}


/* =====================================================
   UNIDADES
===================================================== */

function normalizeUnit(unit) {

    const value =
        norm(unit).trim();


    /* GRAMOS */

    if (
        value === "g" ||
        value === "gramo" ||
        value === "gramos"
    ) {

        return "g";

    }


    /* KILOGRAMOS */

    if (
        value === "kg" ||
        value === "kgs" ||
        value === "kilogramo" ||
        value === "kilogramos"
    ) {

        return "kg";

    }


    /* MILILITROS */

    if (
        value === "ml" ||
        value === "mililitro" ||
        value === "mililitros"
    ) {

        return "ml";

    }


    /* LITROS */

    if (
        value === "l" ||
        value === "lt" ||
        value === "lts" ||
        value === "litro" ||
        value === "litros"
    ) {

        return "l";

    }


    /* UNIDADES */

    if (
        value === "unidad" ||
        value === "unidades" ||
        value === "und" ||
        value === "uds"
    ) {

        return "unidad";

    }


    return value;

}


/* =====================================================
   CONVERSIÓN KG → GRAMOS
===================================================== */

function convertQuantityToGrams(
    quantity,
    unit
) {

    const number =
        Number(quantity) || 0;


    const normalized =
        normalizeUnit(unit);


    if (
        normalized === "kg"
    ) {

        return number * 1000;

    }


    return number;

}


/* =====================================================
   CONVERSIÓN PRECIO KG → PRECIO GRAMO
===================================================== */

function convertPriceToGram(
    price,
    unit
) {

    const number =
        Number(price) || 0;


    const normalized =
        normalizeUnit(unit);


    /*
       Si el precio estaba expresado
       por kilogramo, ahora necesitamos
       saber cuánto cuesta UN GRAMO.

       Ejemplo:

       $8 por kg

       $8 / 1000

       = $0.008 por gramo
    */

    if (
        normalized === "kg"
    ) {

        return number / 1000;

    }


    return number;

}


/* =====================================================
   NORMALIZAR INGREDIENTE
===================================================== */

function normalizeIngredient(
    ingredient
) {

    const item =
        clone(ingredient);


    const originalUnit =
        normalizeUnit(
            item.unit
        );


    /*
       Si era KG:

       cantidad:
       kg → g

       precio:
       $/kg → $/g
    */

    if (
        originalUnit === "kg"
    ) {

        item.qty =
            convertQuantityToGrams(
                item.qty,
                originalUnit
            );


        item.unitPrice =
            convertPriceToGram(
                item.unitPrice,
                originalUnit
            );


        item.unit =
            "g";


        item.total =
            Number(item.qty || 0) *
            Number(item.unitPrice || 0);

    }


    /*
       Si ya era gramos,
       simplemente lo dejamos
       en gramos.
    */

    else if (
        originalUnit === "g"
    ) {

        item.unit =
            "g";

        item.qty =
            Number(item.qty) || 0;

        item.unitPrice =
            Number(item.unitPrice) || 0;

        item.total =
            Number(item.qty) *
            Number(item.unitPrice);

    }


    /*
       ml, l y unidades
       se mantienen.
    */

    else {

        item.qty =
            Number(item.qty) || 0;

        item.unitPrice =
            Number(item.unitPrice) || 0;

        item.total =
            Number(item.qty) *
            Number(item.unitPrice);

    }


    return item;

}


/* =====================================================
   NORMALIZAR RECETA
===================================================== */

function normalizeRecipe(
    recipe
) {

    const result =
        clone(recipe);


    result.ingredients =
        (
            result.ingredients || []
        )
        .map(
            normalizeIngredient
        );


    result.total =
        calculateTotal(
            result.ingredients
        );


    return result;

}


/* =====================================================
   NORMALIZAR TODO EL RECETARIO
===================================================== */

D.recipes =
    (
        D.recipes || []
    )
    .map(
        normalizeRecipe
    );


D.subrecipes =
    (
        D.subrecipes || []
    )
    .map(
        normalizeRecipe
    );


/* =====================================================
   LOCAL STORAGE
===================================================== */

const STORAGE_KEY =
    "vickyCafeRecetarioOverridesV3";


const saved =
    JSON.parse(
        localStorage.getItem(
            STORAGE_KEY
        ) || "{}"
    );


/* =====================================================
   APLICAR CAMBIOS GUARDADOS
===================================================== */

function applySaved(
    base,
    overrides
) {

    const byName =
        new Map(
            (overrides || [])
                .map(
                    item => [
                        norm(item.name),
                        {
                            ...item,
                            _edited: true
                        }
                    ]
                )
        );


    const result =
        base.map(
            item => {

                const savedItem =
                    byName.get(
                        norm(item.name)
                    );


                return savedItem
                    ? normalizeRecipe(
                        savedItem
                    )
                    : item;

            }
        );


    const baseNames =
        new Set(
            base.map(
                item =>
                    norm(item.name)
            )
        );


    (
        overrides || []
    )
    .forEach(
        item => {

            if (
                !baseNames.has(
                    norm(item.name)
                )
            ) {

                result.push(
                    normalizeRecipe({
                        ...item,
                        _edited: true
                    })
                );

            }

        }
    );


    return result;

}


D.recipes =
    applySaved(
        D.recipes,
        saved.recipes
    );


D.subrecipes =
    applySaved(
        D.subrecipes,
        saved.subrecipes
    );


/* =====================================================
   COSTO TOTAL
===================================================== */

function calculateTotal(
    ingredients
) {

    return ingredients.reduce(
        (
            total,
            ingredient
        ) => {

            return total +
                (
                    Number(
                        ingredient.qty
                    ) || 0
                ) *
                (
                    Number(
                        ingredient.unitPrice
                    ) || 0
                );

        },
        0
    );

}


/* =====================================================
   GUARDAR
===================================================== */

function cleanItem(
    item
) {

    const result =
        clone(item);


    delete result._edited;


    return result;

}


function persist() {

    const originalRecipes =
        window
            .RECETARIO_ORIGINAL
            ?.recipes || [];


    const originalSubrecipes =
        window
            .RECETARIO_ORIGINAL
            ?.subrecipes || [];


    const originalRecipeNames =
        new Set(
            originalRecipes.map(
                item =>
                    norm(item.name)
            )
        );


    const originalSubrecipeNames =
        new Set(
            originalSubrecipes.map(
                item =>
                    norm(item.name)
            )
        );


    const payload = {

        recipes:
            D.recipes
                .filter(
                    item =>
                        !originalRecipeNames.has(
                            norm(item.name)
                        ) ||
                        item._edited
                )
                .map(
                    cleanItem
                ),


        subrecipes:
            D.subrecipes
                .filter(
                    item =>
                        !originalSubrecipeNames.has(
                            norm(item.name)
                        ) ||
                        item._edited
                )
                .map(
                    cleanItem
                )

    };


    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(payload)
    );

}


/* =====================================================
   BUSCAR INGREDIENTE
===================================================== */

function findIngredient(
    name
) {

    return (
        D.ingredients || []
    )
    .find(
        item =>
            norm(item.name) ===
            norm(name)
    );

}


/* =====================================================
   PRECIO DEL CATÁLOGO
===================================================== */

function catalogPrice(
    name
) {

    const ingredient =
        findIngredient(
            name
        );


    if (!ingredient) {

        return 0;

    }


    const unit =
        normalizeUnit(
            ingredient.unit
        );


    /*
       Si el catálogo dice:

       kg

       y el precio es:

       $10/kg

       convertimos a:

       $0.01/g
    */

    if (
        unit === "kg"
    ) {

        return (
            Number(
                ingredient.price
            ) || 0
        ) / 1000;

    }


    return Number(
        ingredient.price
    ) || 0;

}


/* =====================================================
   UNIDAD DEL CATÁLOGO
===================================================== */

function catalogUnit(
    name
) {

    const ingredient =
        findIngredient(
            name
        );


    if (!ingredient) {

        return "";

    }


    const unit =
        normalizeUnit(
            ingredient.unit
        );


    if (
        unit === "kg"
    ) {

        return "g";

    }


    return unit;

}


/* =====================================================
   TARJETAS
===================================================== */

function card(
    item,
    type
) {

    const label =
        type === "recipe"
            ? "Plato"
            : "Sub receta";


    return `

        <article
            class="card item-card"
            data-open="${type}"
            data-name="${encodeURIComponent(
                item.name
            )}"
        >

            <span class="tag">

                ${label}

            </span>


            <h3>

                ${esc(item.name)}

            </h3>


            <div class="meta">

                ${
                    item.ingredients.length
                }

                ingredientes

                ${
                    item.portions
                        ? `
                            ·
                            ${esc(
                                item.portions
                            )}
                        `
                        : ""
                }

            </div>


            <div class="cost">

                Costo:
                ${money(item.total)}

            </div>


            ${
                item._edited
                    ? `
                        <div
                            class="edited-badge"
                        >
                            ✓ Editado
                        </div>
                    `
                    : ""
            }

        </article>

    `;

}


/* =====================================================
   DASHBOARD
===================================================== */

function dashboard() {

    title.textContent =
        "Panel general";


    const top =
        [...D.recipes]
            .slice(0, 8);


    app.innerHTML = `

        <div class="hero">

            <div>

                <h2>
                    Recetario de Vicky Café
                </h2>

                <p>
                    Consulta, edición y
                    escalado de recetas
                    para cocina y sala.
                </p>

            </div>


            <div class="hero-icon">
                🍽️
            </div>

        </div>


        <div class="quick-actions">

            <button
                class="primary-btn"
                id="new-recipe"
            >
                ＋ Agregar nuevo plato
            </button>


            <button
                class="secondary-btn"
                id="scale-from-home"
            >
                ⚖ Escalar receta
            </button>

        </div>


        <div class="stats">

            <div class="stat">

                <small>
                    Platos
                </small>

                <strong>
                    ${D.recipes.length}
                </strong>

            </div>


            <div class="stat">

                <small>
                    Sub recetas
                </small>

                <strong>
                    ${D.subrecipes.length}
                </strong>

            </div>


            <div class="stat">

                <small>
                    Insumos
                </small>

                <strong>
                    ${D.ingredients.length}
                </strong>

            </div>

        </div>


        <div class="section-head">

            <div>

                <h2>
                    Platos
                </h2>

                <p>
                    Selecciona un plato
                    para consultar su receta.
                </p>

            </div>

        </div>


        <div class="grid">

            ${
                top
                    .map(
                        item =>
                            card(
                                item,
                                "recipe"
                            )
                    )
                    .join("")
            }

        </div>

    `;


    bindCards();


    document
        .getElementById(
            "new-recipe"
        )
        .onclick =
            () =>
                openEditor(
                    "recipe"
                );


    document
        .getElementById(
            "scale-from-home"
        )
        .onclick =
            openScalePicker;

}


/* =====================================================
   LISTADOS
===================================================== */

function listing(type) {

    const isRecipes =
        type === "recipes";


    const isSubrecipes =
        type === "subrecipes";


    const arr =
        isRecipes
            ? D.recipes
            : isSubrecipes
                ? D.subrecipes
                : D.ingredients;


    title.textContent =
        isRecipes
            ? "Platos"
            : isSubrecipes
                ? "Sub recetas"
                : "Insumos";


    /* ================================================
       INSUMOS
    ================================================= */

    if (
        type === "ingredients"
    ) {

        const filtered =
            arr.filter(
                item =>
                    norm(
                        item.name
                    )
                    .includes(
                        norm(query)
                    )
            );


        app.innerHTML = `

            <div class="section-head">

                <div>

                    <h2>
                        Insumos
                    </h2>

                    <p>
                        ${
                            filtered.length
                        }
                        resultados
                    </p>

                </div>

            </div>


            <div class="table-wrap">

                <table class="table">

                    <thead>

                        <tr>

                            <th>
                                Insumo
                            </th>

                            <th>
                                Unidad
                            </th>

                            <th>
                                Precio
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        ${
                            filtered
                                .map(
                                    item => {

                                        let unit =
                                            normalizeUnit(
                                                item.unit
                                            );


                                        let price =
                                            Number(
                                                item.price
                                            ) || 0;


                                        /*
                                           Mostrar los
                                           insumos en gramos.
                                        */

                                        if (
                                            unit === "kg"
                                        ) {

                                            unit = "g";

                                            price =
                                                price / 1000;

                                        }


                                        return `

                                            <tr>

                                                <td>

                                                    <b>

                                                        ${esc(
                                                            item.name
                                                        )}

                                                    </b>

                                                </td>


                                                <td>

                                                    ${
                                                        unit
                                                    }

                                                </td>


                                                <td>

                                                    ${
                                                        money(
                                                            price
                                                        )
                                                    }

                                                    ${
                                                        unit === "g"
                                                            ? " / g"
                                                            : ""
                                                    }

                                                </td>

                                            </tr>

                                        `;

                                    }
                                )
                                .join("")
                        }

                    </tbody>

                </table>

            </div>

        `;


        return;

    }


    /* ================================================
       RECETAS
    ================================================= */

    const filtered =
        arr.filter(
            item => {

                const nameMatch =
                    norm(
                        item.name
                    )
                    .includes(
                        norm(query)
                    );


                const ingredientMatch =
                    item.ingredients.some(
                        ingredient =>
                            norm(
                                ingredient.ingredient
                            )
                            .includes(
                                norm(query)
                            )
                    );


                return (
                    nameMatch ||
                    ingredientMatch
                );

            }
        );


    const addButton =
        isRecipes

            ? `
                <button
                    class="primary-btn"
                    id="new-recipe"
                >
                    ＋ Agregar plato
                </button>
            `

            : `
                <button
                    class="primary-btn"
                    id="new-subrecipe"
                >
                    ＋ Agregar sub receta
                </button>
            `;


    app.innerHTML = `

        <div class="section-head">

            <div>

                <h2>

                    ${
                        isRecipes
                            ? "Platos"
                            : "Sub recetas"
                    }

                </h2>


                <p>

                    ${
                        filtered.length
                    }

                    resultados

                </p>

            </div>


            ${addButton}

        </div>


        ${
            filtered.length

                ? `

                    <div class="grid">

                        ${
                            filtered
                                .map(
                                    item =>
                                        card(
                                            item,
                                            isRecipes
                                                ? "recipe"
                                                : "sub"
                                        )
                                )
                                .join("")
                        }

                    </div>

                `

                : `

                    <div class="empty">

                        No encontramos
                        resultados para:

                        <br><br>

                        <b>
                            ${esc(query)}
                        </b>

                    </div>

                `
        }

    `;


    bindCards();


    if (
        isRecipes
    ) {

        document
            .getElementById(
                "new-recipe"
            )
            .onclick =
                () =>
                    openEditor(
                        "recipe"
                    );

    }
    else {

        document
            .getElementById(
                "new-subrecipe"
            )
            .onclick =
                () =>
                    openEditor(
                        "sub"
                    );

    }

}


/* =====================================================
   ABRIR RECETA
===================================================== */

function openItem(
    type,
    name
) {

    const arr =
        type === "recipe"
            ? D.recipes
            : D.subrecipes;


    const item =
        arr.find(
            recipe =>
                recipe.name ===
                name
        );


    if (!item) return;


    modalContent.innerHTML = `

        <div
            class="modal-actions-top"
        >

            <span class="tag">

                ${
                    type === "recipe"
                        ? "Plato"
                        : "Sub receta"
                }

            </span>


            <div>

                <button
                    class="secondary-btn"
                    id="btn-scale-item"
                >
                    ⚖ Escalar
                </button>


                <button
                    class="primary-btn"
                    id="btn-edit-item"
                >
                    ✎ Editar
                </button>

            </div>

        </div>


        <h2>
            ${esc(item.name)}
        </h2>


        <div class="modal-sub">

            ${
                item.portions
                    ? `
                        Rendimiento:
                        ${esc(
                            item.portions
                        )}
                        ·
                    `
                    : ""
            }

            Costo:
            <b>
                ${money(item.total)}
            </b>

        </div>


        <div class="ingredient-list">

            ${
                item.ingredients
                    .map(
                        ingredient => `

                            <div
                                class="ingredient-row"
                            >

                                <div>

                                    <b>
                                        ${esc(
                                            ingredient.ingredient
                                        )}
                                    </b>

                                </div>


                                <div
                                    class="qty"
                                >

                                    ${
                                        formatQuantity(
                                            ingredient.qty,
                                            ingredient.unit
                                        )
                                    }

                                </div>


                                <div
                                    class="price"
                                >

                                    ${money(
                                        ingredient.total
                                    )}

                                </div>

                            </div>

                        `
                    )
                    .join("")
            }

        </div>

    `;


    modal.classList.remove(
        "hidden"
    );


    document
        .getElementById(
            "btn-scale-item"
        )
        .onclick = () => {

            closeModal();

            openScaler(
                type,
                name
            );

        };


    document
        .getElementById(
            "btn-edit-item"
        )
        .onclick = () => {

            closeModal();

            openEditor(
                type,
                name
            );

        };

}


/* =====================================================
   MOSTRAR CANTIDADES
===================================================== */

function formatQuantity(
    value,
    unit
) {

    const normalized =
        normalizeUnit(unit);


    const number =
        Number(value) || 0;


    if (
        normalized === "g"
    ) {

        return `

            ${number.toLocaleString(
                "es-VE",
                {
                    maximumFractionDigits: 3
                }
            )}

            g

        `;

    }


    if (
        normalized === "ml"
    ) {

        return `

            ${number.toLocaleString(
                "es-VE",
                {
                    maximumFractionDigits: 3
                }
            )}

            ml

        `;

    }


    if (
        normalized === "l"
    ) {

        return `

            ${number.toLocaleString(
                "es-VE",
                {
                    maximumFractionDigits: 3
                }
            )}

            L

        `;

    }


    if (
        normalized === "unidad"
    ) {

        return `

            ${number.toLocaleString(
                "es-VE",
                {
                    maximumFractionDigits: 3
                }
            )}

            und

        `;

    }


    return `

        ${number.toLocaleString(
            "es-VE",
            {
                maximumFractionDigits: 3
            }
        )}

        ${esc(unit || "")}

    `;

}


/* =====================================================
   TARJETAS
===================================================== */

function bindCards() {

    document
        .querySelectorAll(
            "[data-open]"
        )
        .forEach(
            element => {

                element.onclick =
                    () => {

                        const type =
                            element.dataset.open ===
                            "recipe"
                                ? "recipe"
                                : "sub";


                        const name =
                            decodeURIComponent(
                                element.dataset.name
                            );


                        openItem(
                            type,
                            name
                        );

                    };

            }
        );

}


/* =====================================================
   EDITOR
===================================================== */

function openEditor(
    type,
    name = null
) {

    const arr =
        type === "recipe"
            ? D.recipes
            : D.subrecipes;


    const original =
        name
            ? arr.find(
                item =>
                    item.name ===
                    name
            )
            : null;


    editing = {

        type,

        name

    };


    const item =
        original
            ? clone(original)
            : {

                name: "",

                portions: "",

                total: 0,

                ingredients: []

            };


    modalContent.innerHTML = `

        <span class="tag">

            ${
                type === "recipe"
                    ? "Plato"
                    : "Sub receta"
            }

        </span>


        <h2>

            ${
                name
                    ? "Editar receta"
                    : type === "recipe"
                        ? "Agregar nuevo plato"
                        : "Agregar sub receta"
            }

        </h2>


        <form
            id="recipe-form"
            class="recipe-form"
        >

            <label>

                Nombre

                <input
                    id="f-name"
                    required
                    value="${esc(
                        item.name
                    )}"
                    placeholder="Ej. TOMATES CONFITADOS"
                >

            </label>


            <label>

                Rendimiento / porciones

                <input
                    id="f-portions"
                    value="${esc(
                        item.portions || ""
                    )}"
                    placeholder="Ej. 10 porciones"
                >

            </label>


            <div
                class="form-section-head"
            >

                <h3>
                    Ingredientes
                </h3>


                <button
                    type="button"
                    class="secondary-btn"
                    id="add-ingredient"
                >
                    ＋ Añadir ingrediente
                </button>

            </div>


            <div
                id="ingredient-editor"
            ></div>


            <div class="editor-total">

                Costo calculado:

                <strong
                    id="editor-total"
                >
                    $0.00
                </strong>

            </div>


            <div class="form-actions">

                <button
                    type="button"
                    class="secondary-btn"
                    data-close
                >
                    Cancelar
                </button>


                <button
                    type="submit"
                    class="primary-btn"
                >
                    Guardar cambios
                </button>

            </div>

        </form>

    `;


    modal.classList.remove(
        "hidden"
    );


    const holder =
        document.getElementById(
            "ingredient-editor"
        );


    const ingredients =
        item.ingredients.length

            ? item.ingredients

            : [
                {
                    ingredient: "",
                    qty: "",
                    unit: "g",
                    unitPrice: 0,
                    total: 0
                }
            ];


    ingredients.forEach(
        ingredient =>
            addIngredientRow(
                holder,
                ingredient
            )
    );


    document
        .getElementById(
            "add-ingredient"
        )
        .onclick =
            () => {

                addIngredientRow(
                    holder,
                    {
                        ingredient: "",
                        qty: "",
                        unit: "g",
                        unitPrice: 0,
                        total: 0
                    }
                );

            };


    updateEditorTotal();


    document
        .getElementById(
            "recipe-form"
        )
        .onsubmit =
            event => {

                event.preventDefault();

                saveEditor();

            };

}


/* =====================================================
   FILA DE INGREDIENTE
===================================================== */

function addIngredientRow(
    holder,
    item
) {

    const row =
        document.createElement(
            "div"
        );


    row.className =
        "ingredient-editor-row";


    /*
       IMPORTANTE:

       Para ingredientes de peso,
       la unidad por defecto es g.

       Ya no mostramos kg.
    */

    const unit =
        normalizeUnit(
            item.unit
        ) === "kg"

            ? "g"

            : (
                normalizeUnit(
                    item.unit
                ) || "g"
            );


    let quantity =
        Number(
            item.qty
        ) || 0;


    /*
       Si por alguna razón
       un dato todavía viene
       en kg, lo convertimos.
    */

    if (
        normalizeUnit(
            item.unit
        ) === "kg"
    ) {

        quantity *= 1000;

    }


    let price =
        Number(
            item.unitPrice
        ) || 0;


    /*
       Precio por gramo.
    */

    if (
        normalizeUnit(
            item.unit
        ) === "kg"
    ) {

        price /= 1000;

    }


    row.innerHTML = `

        <input
            class="i-name"
            list="ingredient-options"
            placeholder="Ingrediente o sub receta"
            value="${esc(
                item.ingredient
            )}"
        >


        <input
            class="i-qty"
            type="number"
            min="0"
            step="0.001"
            placeholder="Cantidad"
            value="${
                quantity
                    ? quantity
                    : ""
            }"
        >


        <input
            class="i-unit"
            placeholder="Unidad"
            value="${esc(
                unit
            )}"
        >


        <input
            class="i-price"
            type="number"
            min="0"
            step="0.000001"
            placeholder="Precio"
            value="${
                price
            }"
        >


        <button
            type="button"
            class="icon-btn remove-row"
            title="Eliminar ingrediente"
        >
            ×
        </button>

    `;


    holder.appendChild(
        row
    );


    const nameInput =
        row.querySelector(
            ".i-name"
        );


    const unitInput =
        row.querySelector(
            ".i-unit"
        );


    const priceInput =
        row.querySelector(
            ".i-price"
        );


    nameInput.onchange =
        () => {

            if (
                !unitInput.value
            ) {

                unitInput.value =
                    catalogUnit(
                        nameInput.value
                    );

            }


            if (
                !Number(
                    priceInput.value
                )
            ) {

                priceInput.value =
                    catalogPrice(
                        nameInput.value
                    );

            }


            updateEditorTotal();

        };


    row
        .querySelectorAll(
            "input"
        )
        .forEach(
            input =>
                input.oninput =
                    updateEditorTotal
        );


    row
        .querySelector(
            ".remove-row"
        )
        .onclick =
            () => {

                row.remove();

                updateEditorTotal();

            };

}


/* =====================================================
   COSTO DEL EDITOR
===================================================== */

function updateEditorTotal() {

    const rows =
        [
            ...document
                .querySelectorAll(
                    ".ingredient-editor-row"
                )
        ];


    let total = 0;


    rows.forEach(
        row => {

            const quantity =
                Number(
                    row
                        .querySelector(
                            ".i-qty"
                        )
                        .value
                ) || 0;


            const price =
                Number(
                    row
                        .querySelector(
                            ".i-price"
                        )
                        .value
                ) || 0;


            total +=
                quantity *
                price;

        }
    );


    const output =
        document.getElementById(
            "editor-total"
        );


    if (output) {

        output.textContent =
            money(total);

    }

}


/* =====================================================
   GUARDAR EDITOR
===================================================== */

function saveEditor() {

    const type =
        editing.type;


    const arr =
        type === "recipe"
            ? D.recipes
            : D.subrecipes;


    const oldName =
        editing.name;


    const name =
        document
            .getElementById(
                "f-name"
            )
            .value
            .trim()
            .toUpperCase();


    if (!name) {

        alert(
            "Debes colocar el nombre."
        );

        return;

    }


    const ingredients =
        [
            ...document
                .querySelectorAll(
                    ".ingredient-editor-row"
                )
        ]
        .map(
            row => {

                let ingredient =
                    row
                        .querySelector(
                            ".i-name"
                        )
                        .value
                        .trim()
                        .toUpperCase();


                let qty =
                    Number(
                        row
                            .querySelector(
                                ".i-qty"
                            )
                            .value
                    ) || 0;


                let unit =
                    normalizeUnit(
                        row
                            .querySelector(
                                ".i-unit"
                            )
                            .value
                    );


                let unitPrice =
                    Number(
                        row
                            .querySelector(
                                ".i-price"
                            )
                            .value
                    ) || 0;


                /*
                   Si alguien escribe kg
                   manualmente, también
                   lo convertimos.
                */

                if (
                    unit === "kg"
                ) {

                    qty *= 1000;

                    unitPrice /= 1000;

                    unit = "g";

                }


                const total =
                    qty *
                    unitPrice;


                return {

                    ingredient,

                    qty,

                    unit,

                    unitPrice,

                    total

                };

            }
        )
        .filter(
            item =>
                item.ingredient
        );


    const item = {

        name,

        portions:
            document
                .getElementById(
                    "f-portions"
                )
                .value
                .trim(),

        total:
            calculateTotal(
                ingredients
            ),

        ingredients,

        _edited: true

    };


    const index =
        oldName
            ? arr.findIndex(
                recipe =>
                    recipe.name ===
                    oldName
            )
            : -1;


    if (
        index >= 0
    ) {

        arr[index] =
            item;

    }
    else {

        arr.push(
            item
        );

    }


    persist();


    closeModal();


    render();


    alert(
        oldName
            ? "Receta actualizada correctamente."
            : "Receta creada correctamente."
    );

}


/* =====================================================
   ESCALADOR
===================================================== */

function openScaler(
    type,
    name
) {

    const arr =
        type === "recipe"
            ? D.recipes
            : D.subrecipes;


    const item =
        arr.find(
            recipe =>
                recipe.name ===
                name
        );


    if (!item) return;


    modalContent.innerHTML = `

        <span class="tag">
            Escalador
        </span>


        <h2>
            ${esc(item.name)}
        </h2>


        <p class="helper">

            Selecciona el ingrediente
            que usarás como referencia.

            <br><br>

            Después escribe cuántos
            gramos tienes disponibles.

            <br><br>

            El sistema calculará
            automáticamente el resto
            de la receta.

        </p>


        <div class="scale-form">

            <label>

                Ingrediente base

                <select
                    id="scale-ingredient"
                >

                    ${
                        item.ingredients
                            .map(
                                (
                                    ingredient,
                                    index
                                ) => `

                                    <option
                                        value="${index}"
                                    >

                                        ${esc(
                                            ingredient.ingredient
                                        )}

                                        —

                                        ${
                                            formatQuantity(
                                                ingredient.qty,
                                                ingredient.unit
                                            )
                                        }

                                    </option>

                                `
                            )
                            .join("")
                    }

                </select>

            </label>


            <label>

                Cantidad disponible

                <input
                    id="scale-target"
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder="Ej. 122"
                >

            </label>


            <label>

                Unidad

                <select
                    id="scale-target-unit"
                >

                    <option value="g">
                        Gramos (g)
                    </option>

                    <option value="ml">
                        Mililitros (ml)
                    </option>

                    <option value="unidad">
                        Unidades
                    </option>

                </select>

            </label>


            <button
                class="primary-btn"
                id="calculate-scale"
            >
                Calcular
            </button>

        </div>


        <div
            id="scale-result"
        ></div>

    `;


    modal.classList.remove(
        "hidden"
    );


    /*
       Cambiar automáticamente
       la unidad según el ingrediente.
    */

    const selector =
        document.getElementById(
            "scale-ingredient"
        );


    const unitSelector =
        document.getElementById(
            "scale-target-unit"
        );


    function updateScaleUnit() {

        const index =
            Number(
                selector.value
            );


        const ingredient =
            item.ingredients[
                index
            ];


        if (!ingredient) return;


        const unit =
            normalizeUnit(
                ingredient.unit
            );


        if (
            unit === "ml"
        ) {

            unitSelector.value =
                "ml";

        }
        else if (
            unit === "unidad"
        ) {

            unitSelector.value =
                "unidad";

        }
        else {

            /*
               Todo peso será gramos.
            */

            unitSelector.value =
                "g";

        }

    }


    selector.onchange =
        updateScaleUnit;


    updateScaleUnit();


    document
        .getElementById(
            "calculate-scale"
        )
        .onclick =
            () =>
                calculateScale(
                    item
                );

}


/* =====================================================
   CONVERSIÓN PARA ESCALADOR
===================================================== */

function convertToBase(
    value,
    unit
) {

    const normalized =
        normalizeUnit(
            unit
        );


    const number =
        Number(value) || 0;


    /*
       Peso:
       unidad base = gramos
    */

    if (
        normalized === "g"
    ) {

        return number;

    }


    /*
       Volumen:
       unidad base = ml
    */

    if (
        normalized === "ml"
    ) {

        return number;

    }


    /*
       Litros.
    */

    if (
        normalized === "l"
    ) {

        return number * 1000;

    }


    /*
       Unidades.
    */

    return number;

}


/* =====================================================
   CONVERTIR DESDE BASE
===================================================== */

function convertFromBase(
    value,
    unit
) {

    const normalized =
        normalizeUnit(
            unit
        );


    if (
        normalized === "l"
    ) {

        return value / 1000;

    }


    return value;

}


/* =====================================================
   ESCALAR RECETA
===================================================== */

function calculateScale(
    item
) {

    const ingredientIndex =
        Number(
            document
                .getElementById(
                    "scale-ingredient"
                )
                .value
        );


    const target =
        Number(
            document
                .getElementById(
                    "scale-target"
                )
                .value
        );


    const targetUnit =
        normalizeUnit(
            document
                .getElementById(
                    "scale-target-unit"
                )
                .value
        );


    const base =
        item.ingredients[
            ingredientIndex
        ];


    const result =
        document.getElementById(
            "scale-result"
        );


    if (!base) {

        return;

    }


    if (
        target <= 0
    ) {

        result.innerHTML = `

            <div class="notice">

                Coloca una cantidad
                mayor que cero.

            </div>

        `;

        return;

    }


    const baseUnit =
        normalizeUnit(
            base.unit
        );


    /*
       Determinar tipo de unidad.
    */

    const baseIsWeight =
        baseUnit === "g" ||
        baseUnit === "kg";


    const targetIsWeight =
        targetUnit === "g" ||
        targetUnit === "kg";


    const baseIsVolume =
        baseUnit === "ml" ||
        baseUnit === "l";


    const targetIsVolume =
        targetUnit === "ml" ||
        targetUnit === "l";


    const baseIsUnit =
        baseUnit === "unidad";


    const targetIsUnit =
        targetUnit === "unidad";


    /*
       Evitar mezclar gramos con ml.
    */

    if (
        baseIsWeight !==
        targetIsWeight
    ) {

        if (
            baseIsWeight ||
            targetIsWeight
        ) {

            result.innerHTML = `

                <div class="notice">

                    La unidad de referencia
                    debe ser compatible.

                    <br><br>

                    Si el ingrediente está
                    expresado en gramos,
                    coloca la cantidad
                    también en gramos.

                </div>

            `;

            return;

        }

    }


    if (
        baseIsVolume !==
        targetIsVolume
    ) {

        if (
            baseIsVolume ||
            targetIsVolume
        ) {

            result.innerHTML = `

                <div class="notice">

                    No puedes comparar
                    mililitros con gramos.

                </div>

            `;

            return;

        }

    }


    if (
        baseIsUnit !==
        targetIsUnit
    ) {

        if (
            baseIsUnit ||
            targetIsUnit
        ) {

            result.innerHTML = `

                <div class="notice">

                    Las unidades deben
                    coincidir.

                </div>

            `;

            return;

        }

    }


    const baseQuantity =
        convertToBase(
            base.qty,
            baseUnit
        );


    const targetQuantity =
        convertToBase(
            target,
            targetUnit
        );


    if (
        baseQuantity <= 0
    ) {

        result.innerHTML = `

            <div class="notice">

                La cantidad original
                del ingrediente debe
                ser mayor que cero.

            </div>

        `;

        return;

    }


    /*
       FACTOR
    */

    const factor =
        targetQuantity /
        baseQuantity;


    /*
       Escalar ingredientes.
    */

    const rows =
        item.ingredients.map(
            ingredient => {

                const ingredientUnit =
                    normalizeUnit(
                        ingredient.unit
                    );


                const original =
                    convertToBase(
                        ingredient.qty,
                        ingredientUnit
                    );


                const scaledBase =
                    original *
                    factor;


                const scaled =
                    convertFromBase(
                        scaledBase,
                        ingredientUnit
                    );


                const scaledTotal =
                    scaled *
                    (
                        Number(
                            ingredient.unitPrice
                        ) || 0
                    );


                return {

                    ...ingredient,

                    scaled,

                    scaledTotal

                };

            }
        );


    const total =
        rows.reduce(
            (
                sum,
                ingredient
            ) =>
                sum +
                ingredient.scaledTotal,
            0
        );


    result.innerHTML = `

        <div class="scale-summary">

            <b>
                Factor de escala:
            </b>

            ${factor.toFixed(6)}

            <br><br>

            <b>
                Costo estimado:
            </b>

            ${money(total)}

        </div>


        <div class="ingredient-list">

            ${
                rows
                    .map(
                        ingredient => `

                            <div
                                class="ingredient-row"
                            >

                                <div>

                                    <b>
                                        ${esc(
                                            ingredient.ingredient
                                        )}
                                    </b>

                                </div>


                                <div
                                    class="qty"
                                >

                                    ${
                                        formatQuantity(
                                            ingredient.scaled,
                                            ingredient.unit
                                        )
                                    }

                                </div>


                                <div
                                    class="price"
                                >

                                    ${money(
                                        ingredient.scaledTotal
                                    )}

                                </div>

                            </div>

                        `
                    )
                    .join("")
            }

        </div>

    `;

}


/* =====================================================
   SELECTOR DE RECETAS
===================================================== */

function openScalePicker() {

    const allRecipes = [

        ...D.recipes.map(
            item => ({
                ...item,
                _type: "recipe"
            })
        ),

        ...D.subrecipes.map(
            item => ({
                ...item,
                _type: "sub"
            })
        )

    ];


    modalContent.innerHTML = `

        <span class="tag">
            Escalador
        </span>


        <h2>
            Elegir receta
        </h2>


        <div class="scale-picker">

            ${
                allRecipes
                    .map(
                        item => `

                            <button
                                class="scale-choice"
                                data-name="${encodeURIComponent(
                                    item.name
                                )}"
                                data-type="${item._type}"
                            >

                                <b>
                                    ${esc(
                                        item.name
                                    )}
                                </b>


                                <small>

                                    ${
                                        item.ingredients.length
                                    }

                                    ingredientes

                                </small>

                            </button>

                        `
                    )
                    .join("")
            }

        </div>

    `;


    modal.classList.remove(
        "hidden"
    );


    modalContent
        .querySelectorAll(
            ".scale-choice"
        )
        .forEach(
            button => {

                button.onclick =
                    () => {

                        closeModal();


                        openScaler(
                            button.dataset.type,
                            decodeURIComponent(
                                button.dataset.name
                            )
                        );

                    };

            }
        );

}


/* =====================================================
   DATALIST
===================================================== */

const datalist =
    document.createElement(
        "datalist"
    );


datalist.id =
    "ingredient-options";


datalist.innerHTML =
    [
        ...(D.ingredients || []),
        ...(D.subrecipes || [])
    ]
    .map(
        item =>
            `<option value="${esc(
                item.name
            )}"></option>`
    )
    .join("");


document
    .body
    .appendChild(
        datalist
    );


/* =====================================================
   MODAL
===================================================== */

function closeModal() {

    modal.classList.add(
        "hidden"
    );

}


/* =====================================================
   NAVEGACIÓN
===================================================== */

let view =
    "dashboard";


let query =
    "";


let editing =
    null;


document
    .querySelectorAll(
        ".nav-btn"
    )
    .forEach(
        button => {

            button.onclick =
                () => {

                    view =
                        button.dataset.view;


                    document
                        .querySelectorAll(
                            ".nav-btn"
                        )
                        .forEach(
                            other =>
                                other.classList.toggle(
                                    "active",
                                    other === button
                                )
                        );


                    query = "";

                    search.value =
                        "";


                    render();

                };

        }
    );


/* =====================================================
   BUSCADOR
===================================================== */

search.oninput =
    event => {

        query =
            event.target.value;


        if (
            view ===
            "dashboard"
        ) {

            view =
                "recipes";

        }


        render();

    };


/* =====================================================
   CERRAR
===================================================== */

document
    .querySelectorAll(
        "[data-close]"
    )
    .forEach(
        element =>
            element.onclick =
                closeModal
    );


modal.addEventListener(
    "click",
    event => {

        if (
            event.target.matches(
                "[data-close], .modal-backdrop"
            )
        ) {

            closeModal();

        }

    }
);


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape"
        ) {

            closeModal();

        }

    }
);


/* =====================================================
   RENDER
===================================================== */

function render() {

    if (
        view ===
        "dashboard"
    ) {

        dashboard();

    }
    else {

        listing(
            view
        );

    }

}


/* =====================================================
   INICIAR
===================================================== */

render();