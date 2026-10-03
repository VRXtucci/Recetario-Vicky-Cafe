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
   SUPABASE - SINCRONIZACIÓN
===================================================== */

let supabaseReady = false;

// Botón exportar data.js
document.addEventListener('DOMContentLoaded', () => {
    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) {
        exportBtn.onclick = exportDataJS;
    }
});

function exportDataJS() {
    const data = {
        restaurant: D.restaurant,
        currency: D.currency,
        ingredients: D.ingredients,
        recipes: D.recipes.map(cleanItem),
        subrecipes: D.subrecipes.map(cleanItem)
    };

    const content = 'window.RECETARIO = ' + JSON.stringify(data, null, 2) + ';';
    const blob = new Blob([content], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.js';
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Archivo exportado', 'data.js descargado correctamente');
}

async function initSupabase() {

    try {

        console.log("Conectando con Supabase...");

        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient
        ) {

            throw new Error(
                "supabaseClient no está disponible"
            );

        }


        /*
        =====================================================
        VERIFICAR CONEXIÓN
        =====================================================
        */

        const {
            error
        } =
            await supabaseClient
                .from("recipes")
                .select("id")
                .limit(1);


        if (error) {

            throw error;

        }


        supabaseReady = true;

        console.log(
            "✅ Supabase conectado correctamente"
        );


        /*
        =====================================================
        CARGAR DATOS DESDE SUPABASE
        =====================================================
        */

        const loaded =
            await loadRecetarioFromSupabase();


        /*
        =====================================================
        SI SUPABASE ESTÁ VACÍO
        =====================================================

        Esto solamente sirve para la primera carga.

        Si las tres tablas están vacías,
        migramos una sola vez el data.js.

        IMPORTANTE:
        No se ejecuta si ya existen datos.
        =====================================================
        */

        if (
            loaded &&
            loaded.isEmpty
        ) {

            console.log(
                "Supabase está vacío."
            );

            console.log(
                "Migrando datos iniciales desde data.js..."
            );


            await migrateDataToSupabase();


            /*
            Volvemos a cargar los datos,
            pero ahora desde Supabase.
            */

            await loadRecetarioFromSupabase();

        }


        console.log(
            "✅ Recetario cargado desde Supabase"
        );


        return true;


    } catch (error) {

        console.warn(
            "⚠️ Supabase no disponible."
        );

        console.warn(
            "Se utilizará data.js como respaldo."
        );

        console.error(
            error
        );


        supabaseReady =
            false;


        return false;

    }

}

async function loadRecetarioFromSupabase() {

    if (
        !supabaseReady
    ) {

        return null;

    }


    console.log(
        "📥 Cargando recetario desde Supabase..."
    );


    try {


        /*
        =====================================================
        CARGAR INSUMOS
        =====================================================
        */

        const ingredients =
            await loadFromSupabase(
                "ingredients"
            );


        /*
        =====================================================
        CARGAR PLATOS
        =====================================================
        */

        const recipes =
            await loadFromSupabase(
                "recipes"
            );


        /*
        =====================================================
        CARGAR SUB-RECETAS
        =====================================================
        */

        const subrecipes =
            await loadFromSupabase(
                "subrecipes"
            );


        /*
        =====================================================
        COMPROBAR RESULTADOS
        =====================================================
        */

        if (
            ingredients === null ||
            recipes === null ||
            subrecipes === null
        ) {

            throw new Error(
                "No se pudieron cargar todas las tablas de Supabase."
            );

        }


        console.log(
            "Ingredientes desde Supabase:",
            ingredients.length
        );


        console.log(
            "Platos desde Supabase:",
            recipes.length
        );


        console.log(
            "Sub-recetas desde Supabase:",
            subrecipes.length
        );


        /*
        =====================================================
        SI LAS TRES TABLAS ESTÁN VACÍAS
        =====================================================
        */

        const isEmpty =
            ingredients.length === 0 &&
            recipes.length === 0 &&
            subrecipes.length === 0;


        if (
            isEmpty
        ) {

            return {
                isEmpty: true
            };

        }


        /*
        =====================================================
        CONVERTIR INGREDIENTES
        =====================================================
        */

        D.ingredients =
            ingredients.map(
                ingredient => ({

                    id:
                        ingredient.id,

                    name:
                        ingredient.name,

                    unit:
                        ingredient.unit

                })
            );


        /*
        =====================================================
        CONVERTIR RECETAS
        =====================================================
        */

        D.recipes =
            recipes.map(
                recipe => {

                    let parsedIngredients =
                        [];


                    try {

                        if (
                            Array.isArray(
                                recipe.ingredients
                            )
                        ) {

                            parsedIngredients =
                                recipe.ingredients;

                        }
                        else if (
                            typeof recipe.ingredients ===
                            "string"
                        ) {

                            parsedIngredients =
                                JSON.parse(
                                    recipe.ingredients
                                );

                        }

                    } catch (error) {

                        console.error(
                            "Error leyendo ingredientes de receta:",
                            recipe.name,
                            error
                        );

                        parsedIngredients =
                            [];

                    }


                    return normalizeRecipe({

                        id:
                            recipe.id,

                        name:
                            recipe.name,

                        portions:
                            recipe.portions,

                        ingredients:
                            parsedIngredients

                    });

                }
            );


        /*
        =====================================================
        CONVERTIR SUB-RECETAS
        =====================================================
        */

        D.subrecipes =
            subrecipes.map(
                subrecipe => {

                    let parsedIngredients =
                        [];


                    try {

                        if (
                            Array.isArray(
                                subrecipe.ingredients
                            )
                        ) {

                            parsedIngredients =
                                subrecipe.ingredients;

                        }
                        else if (
                            typeof subrecipe.ingredients ===
                            "string"
                        ) {

                            parsedIngredients =
                                JSON.parse(
                                    subrecipe.ingredients
                                );

                        }

                    } catch (error) {

                        console.error(
                            "Error leyendo ingredientes de sub-receta:",
                            subrecipe.name,
                            error
                        );

                        parsedIngredients =
                            [];

                    }


                    return normalizeRecipe({

                        id:
                            subrecipe.id,

                        name:
                            subrecipe.name,

                        portions:
                            subrecipe.portions,

                        ingredients:
                            parsedIngredients

                    });

                }
            );


        /*
        =====================================================
        INSUMOS PERSONALIZADOS
        =====================================================
        */

        const customIngredients =
            loadCustomIngredients();


        D.ingredients = [

            ...D.ingredients,

            ...customIngredients

        ];


        /*
        =====================================================
        MOSTRAR EN CONSOLA
        =====================================================
        */

        console.log(
            "📦 Recetario cargado:"
        );

        console.log(
            "Ingredientes:",
            D.ingredients.length
        );

        console.log(
            "Platos:",
            D.recipes.length
        );

        console.log(
            "Sub-recetas:",
            D.subrecipes.length
        );


        return {

            isEmpty:
                false,

            ingredients:
                D.ingredients,

            recipes:
                D.recipes,

            subrecipes:
                D.subrecipes

        };


    } catch (error) {

        console.error(
            "❌ Error cargando recetario desde Supabase:",
            error
        );


        return null;

    }

}

async function migrateDataToSupabase() {
    if (!supabaseReady) return;

    console.log('Migrando datos a Supabase...');

    try {
        // Migrar ingredientes
        const ingredients = D.ingredients.map(ing => ({
            name: ing.name,
            unit: ing.unit
        }));

        for (const ing of ingredients) {
            const { error } = await supabaseClient.from('ingredients').upsert(ing, { onConflict: 'name' });
            if (error) console.error('Error migrando ingrediente:', ing.name, error);
        }
        console.log(`Ingredientes migrados: ${ingredients.length}`);

        // Migrar recetas
        const recipes = D.recipes.map(r => ({
            name: r.name,
            portions: r.portions,
            ingredients: JSON.stringify(r.ingredients)
        }));

        for (const rec of recipes) {
            const { error } = await supabaseClient.from('recipes').upsert(rec, { onConflict: 'name' });
            if (error) console.error('Error migrando receta:', rec.name, error);
        }
        console.log(`Recetas migradas: ${recipes.length}`);

        // Migrar subrecetas
        const subrecipes = D.subrecipes.map(s => ({
            name: s.name,
            portions: s.portions,
            ingredients: JSON.stringify(s.ingredients)
        }));

        for (const sub of subrecipes) {
            const { error } = await supabaseClient.from('subrecipes').upsert(sub, { onConflict: 'name' });
            if (error) console.error('Error migrando subreceta:', sub.name, error);
        }
        console.log(`Subrecetas migradas: ${subrecipes.length}`);

        console.log('Migración completada');
        showNotification('Sincronización completada', 'Todos los datos fueron enviados a Supabase');
    } catch (e) {
        console.error('Error en migración:', e);
    }
}

async function syncToSupabase(
    table,
    data
) {

    if (
        !supabaseReady
    ) {

        return;

    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from(table)
                .upsert(
                    data,
                    {
                        onConflict:
                            "name"
                    }
                );


        if (
            error
        ) {

            console.error(
                `Error sincronizando ${table}:`,
                error
            );

            return;

        }


        console.log(
            `✅ ${table} sincronizado:`,
            data.name
        );


    } catch (
        error
    ) {

        console.error(
            `Error sincronizando ${table}:`,
            error
        );

    }

}

async function deleteFromSupabase(table, id) {
    if (!supabaseReady) return;
    try {
        const { error } = await supabaseClient.from(table).delete().eq('id', id);
        if (error) console.error(`Error eliminando de ${table}:`, error);
    } catch (e) {
        console.error(`Error eliminando de ${table}:`, e);
    }
}

async function loadFromSupabase(table) {
    if (!supabaseReady) return null;
    try {
        const { data, error } = await supabaseClient.from(table).select('*');
        if (error) throw error;
        return data;
    } catch (e) {
        console.error(`Error cargando ${table}:`, e);
        return null;
    }
}

/* =====================================================
   CARGAR INSUMOS PERSONALIZADOS
===================================================== */

const INGREDIENTS_STORAGE_KEY = "vickyCafeCustomIngredientsV1";

function loadCustomIngredients() {
    try {
        return JSON.parse(localStorage.getItem(INGREDIENTS_STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function saveCustomIngredients(ingredients) {
    localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(ingredients));
}

D.ingredients = [
    ...(D.ingredients || []),
    ...loadCustomIngredients()
];


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
       Si era KG, convertimos a gramos.
       ml, l y unidades se mantienen.
    */

    if (
        originalUnit === "kg"
    ) {

        item.qty =
            convertQuantityToGrams(
                item.qty,
                originalUnit
            );

        item.unit =
            "g";

    }
    else {

        item.qty =
            Number(item.qty) || 0;

    }


    delete item.unitPrice;
    delete item.total;


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


    delete result.total;


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

    // Sincronizar con Supabase
    if (supabaseReady) {
        const allRecipes = D.recipes.map(cleanItem).map(r => ({
            ...r,
            ingredients: JSON.stringify(r.ingredients)
        }));
        const allSubrecipes = D.subrecipes.map(cleanItem).map(s => ({
            ...s,
            ingredients: JSON.stringify(s.ingredients)
        }));

        allRecipes.forEach(r => syncToSupabase('recipes', r));
        allSubrecipes.forEach(s => syncToSupabase('subrecipes', s));
    }

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


    const featured = [
        "BOCATA DE RES",
        "BOCATA POLLO",
        "BOCATA CAPRESSA",
        "PURÉ DE PAPA",
        "CREMA DE APIO",
        "CREMA DE AUYAMA",
        "ENSALADA COLESLAW",
        "LOMO EN SALSA",
        "PECHUGA CREMOSA",
    ];

    const top =
        featured
            .map(
                name =>
                    D.recipes.find(
                        r =>
                            norm(r.name) ===
                            norm(name)
                    )
            )
            .filter(Boolean);


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

                <button
                    class="primary-btn"
                    id="new-ingredient"
                >
                    ＋ Agregar insumo
                </button>

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


                                        /*
                                           Mostrar los
                                           insumos en gramos.
                                        */

                                        if (
                                            unit === "kg"
                                        ) {

                                            unit = "g";

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


        document
            .getElementById("new-ingredient")
            .onclick = openIngredientModal;

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
                    `
                    : ""
            }

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
                    unit: "g"
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
                        unit: "g"
                    }
                );

            };


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

        };

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


                /*
                   Si alguien escribe kg
                   manualmente, también
                   lo convertimos.
                */

                if (
                    unit === "kg"
                ) {

                    qty *= 1000;

                    unit = "g";

                }


                return {

                    ingredient,

                    qty,

                    unit

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


                return {

                    ...ingredient,

                    scaled

                };

            }
        );


    result.innerHTML = `

        <div class="scale-summary">

            <b>
                Factor de escala:
            </b>

            ${factor.toFixed(6)}

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
    else if (
        view ===
        "tasks"
    ) {

        renderTasks();

    }
    else {

        listing(
            view
        );

    }

}


/* =====================================================
   NUEVO INSUMO
===================================================== */

function openIngredientModal() {
    modalContent.innerHTML = `
        <span class="tag">Nuevo insumo</span>
        <h2>Agregar insumo</h2>
        <form id="ingredient-form" class="recipe-form">
            <label>
                Nombre del insumo
                <input
                    id="f-ing-name"
                    required
                    placeholder="Ej. CREMA DE LECHE"
                >
            </label>
            <label>
                Unidad
                <select id="f-ing-unit">
                    <option value="KG">Kilogramo (KG)</option>
                    <option value="L">Litro (L)</option>
                    <option value="UNIDAD">Unidad</option>
                    <option value="PAQUETE">Paquete</option>
                    <option value="FRASCO">Frasco</option>
                    <option value="METRO">Metro</option>
                </select>
            </label>
            <div class="form-actions">
                <button type="button" class="secondary-btn" data-close>Cancelar</button>
                <button type="submit" class="primary-btn">Guardar insumo</button>
            </div>
        </form>
    `;

    modal.classList.remove("hidden");

    document.getElementById("ingredient-form").onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById("f-ing-name").value.trim().toUpperCase();
        const unit = document.getElementById("f-ing-unit").value;

        if (!name) return;

        const customIngredients = loadCustomIngredients();
        const exists = D.ingredients.some(i => norm(i.name) === norm(name)) ||
                       customIngredients.some(i => norm(i.name) === norm(name));

        if (exists) {
            alert("Este insumo ya existe en el catálogo.");
            return;
        }

        customIngredients.push({ name, unit });
        saveCustomIngredients(customIngredients);

        D.ingredients.push({ name, unit });

        closeModal();
        render();
        showNotification("Insumo agregado", name);
    };
}

/* =====================================================
   TASKS
===================================================== */

const TASKS_STORAGE_KEY = "vickyCafeTasksV1";

function loadTasks() {
    try {
        return JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function saveTasks(tasks) {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));

    // Sincronizar con Supabase
    if (supabaseReady) {
        tasks.forEach(task => {
            const { id, ...rest } = task;
            syncToSupabase('tasks', {
                ...rest,
                reminder: task.reminder || null,
                reminder_sent: task.reminderSent || false
            });
        });
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function showNotification(title, message, isReminder = false) {
    const existing = document.querySelectorAll('.notification');
    if (existing.length >= 3) {
        existing[0].remove();
    }

    const el = document.createElement('div');
    el.className = 'notification' + (isReminder ? ' reminder' : '');
    el.innerHTML = `
        <span class="notification-icon">${isReminder ? '⏰' : '🔔'}</span>
        <div class="notification-content">
            <p class="notification-title">${esc(title)}</p>
            <p class="notification-message">${esc(message)}</p>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    document.body.appendChild(el);

    setTimeout(() => {
        el.classList.add('hiding');
        setTimeout(() => el.remove(), 300);
    }, 5000);
}

function checkReminders() {
    const tasks = loadTasks();
    const now = new Date();

    tasks.forEach(task => {
        if (task.reminder && !task.reminderSent) {
            const reminderTime = new Date(task.reminder);
            if (reminderTime <= now) {
                showNotification(
                    'Recordatorio: ' + task.title,
                    task.description || 'Es hora de realizar esta tarea',
                    true
                );
                task.reminderSent = true;
                saveTasks(tasks);

                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('Vicky Café - Recordatorio', {
                        body: task.title,
                        icon: '🍽️'
                    });
                }
            }
        }
    });
}

function renderTasks() {
    title.textContent = 'Tareas del día';

    const tasks = loadTasks();
    const pendingCount = tasks.filter(t => !t.completed).length;

    app.innerHTML = `
        <div class="section-head">
            <div>
                <h2>
                    Lista de tareas
                    ${pendingCount > 0 ? `<span class="task-badge">${pendingCount} pendientes</span>` : ''}
                </h2>
                <p>Organiza tu día y recibe recordatorios</p>
            </div>
        </div>

        <form class="task-form" id="task-form">
            <div class="task-form-row">
                <label>
                    Tarea
                    <input type="text" id="task-title" placeholder="Ej. Preparar salsa napolitana" required>
                </label>
                <label>
                    Hora
                    <input type="time" id="task-time">
                </label>
                <label>
                    Prioridad
                    <select id="task-priority">
                        <option value="low">Baja</option>
                        <option value="medium" selected>Media</option>
                        <option value="high">Alta</option>
                    </select>
                </label>
                <button type="submit" class="primary-btn">＋ Agregar</button>
            </div>
            <div style="margin-top:10px">
                <label>
                    Insumo (opcional)
                    <input type="text" id="task-ingredient" placeholder="Ej. CREMA DE LECHE, TOMATE, etc.">
                </label>
            </div>
            <div style="margin-top:10px">
                <label>
                    Descripción (opcional)
                    <input type="text" id="task-desc" placeholder="Detalles adicionales...">
                </label>
            </div>
        </form>

        <div class="task-list" id="task-list"></div>
    `;

    const list = document.getElementById('task-list');

    if (tasks.length === 0) {
        list.innerHTML = `
            <div class="task-empty">
                No hay tareas registradas.<br>
                Agrega tu primera tarea para organizar el día.
            </div>
        `;
    } else {
        const sorted = [...tasks].sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            const pa = { high: 0, medium: 1, low: 2 };
            return pa[a.priority] - pa[b.priority];
        });

        list.innerHTML = sorted.map(task => `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                <button class="task-checkbox ${task.completed ? 'checked' : ''}" data-action="toggle">
                    ${task.completed ? '✓' : ''}
                </button>
                <div class="task-info">
                    <p class="task-title">${esc(task.title)}</p>
                    <div class="task-meta">
                        ${task.ingredient ? `<span>🥕 ${esc(task.ingredient)}</span>` : ''}
                        ${task.time ? `<span>🕐 ${esc(task.time)}</span>` : ''}
                        ${task.description ? `<span>📝 ${esc(task.description)}</span>` : ''}
                        ${task.reminder ? `<span>⏰ Recordatorio</span>` : ''}
                    </div>
                </div>
                <span class="task-priority ${task.priority}">
                    ${task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                </span>
                <button class="task-delete" data-action="delete" title="Eliminar">×</button>
            </div>
        `).join('');
    }

    document.getElementById('task-form').onsubmit = (e) => {
        e.preventDefault();
        const title = document.getElementById('task-title').value.trim();
        const time = document.getElementById('task-time').value;
        const priority = document.getElementById('task-priority').value;
        const description = document.getElementById('task-desc').value.trim();
        const ingredient = document.getElementById('task-ingredient').value.trim();

        if (!title) return;

        const tasks = loadTasks();
        const newTask = {
            id: generateId(),
            title,
            time,
            priority,
            description,
            ingredient,
            completed: false,
            reminder: time ? new Date().toDateString() + ' ' + time : null,
            reminderSent: false,
            createdAt: new Date().toISOString()
        };

        tasks.push(newTask);
        saveTasks(tasks);
        renderTasks();

        showNotification('Tarea agregada', title);

        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    };

    list.querySelectorAll('.task-item').forEach(item => {
        const id = item.dataset.id;
        const tasks = loadTasks();

        item.querySelector('[data-action="toggle"]').onclick = () => {
            const task = tasks.find(t => t.id === id);
            if (task) {
                task.completed = !task.completed;
                saveTasks(tasks);
                renderTasks();
                if (task.completed) {
                    showNotification('Tarea completada', task.title);
                }
            }
        };

        item.querySelector('[data-action="delete"]').onclick = () => {
            const filtered = tasks.filter(t => t.id !== id);
            saveTasks(filtered);
            renderTasks();
        };
    });
}

/* =====================================================
   INICIAR APLICACIÓN
===================================================== */

async function startApplication() {

    console.log(
        "🚀 Iniciando Recetario Vicky Café..."
    );


    /*
    Primero intentamos conectar
    y cargar Supabase.
    */

    await initSupabase();


    /*
    Si Supabase funcionó,
    D ya contiene los datos de la base.
    */


    /*
    Volver a normalizar todo.
    */

    D.ingredients =
        (
            D.ingredients || []
        );


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


    /*
    Finalmente renderizamos.
    */

    render();


    console.log(
        "✅ Aplicación iniciada correctamente."
    );

}


/*
=====================================================
ARRANCAR
=====================================================
*/

startApplication();