let products = [];
let categories = [];
let attributes = {};
let subcategoryCache = {};

document.addEventListener('DOMContentLoaded', function () {
    // Carga inicial de todos los datos necesarios.
    cargarDatosIniciales();
});

function cargarDatosIniciales() {
    showLoading();
    Promise.all([
        fetch('/get_categories').then(response => response.json()),
        fetch('/get_attributes').then(response => response.json())
    ]).then(([categoriesData, attributesData]) => {
        categories = categoriesData;
        attributes = attributesData;
        populateCategories();
        populateAttributes();
        hideLoading();
    }).catch(error => {
        console.error('Error loading initial data:', error);
        hideLoading();
    });
}

function populateCategories() {
    const categorySelect = document.getElementById('category');
    categorySelect.innerHTML = '<option value="">Seleccione una opción</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.text = category.name;
        categorySelect.appendChild(option);
    });
}

function populateAttributes() {
    // Suponemos que existe un contenedor para los atributos.
    const attributeContainer = document.getElementById('attributeContainer');
    attributeContainer.innerHTML = '';
    Object.keys(attributes).forEach(attrId => {
        const attr = attributes[attrId];
        const option = document.createElement('option');
        option.value = attr.id;
        option.text = attr.name;
        attributeContainer.appendChild(option);
    });
}

// Función para mostrar el modal que ahora solo se encarga de resetear y establecer valores
$('#productModal').on('show.bs.modal', function () {
    document.getElementById('productForm').reset();
    document.getElementById('attributeContainer').innerHTML = '';
    // Restablecer subcategorías
    ['subcategory1', 'subcategory2', 'subcategory3', 'subcategory4'].forEach(resetSubcategories);
    document.getElementById('product_code').value = '';
    document.getElementById('product_code').disabled = false;
});

function resetSubcategories(subcategoryId) {
    const subcategorySelect = document.getElementById(subcategoryId);
    subcategorySelect.innerHTML = '<option value="">Seleccione una opción</option>';
    // Aquí se puede añadir lógica para repoblar las subcategorías si es necesario.
}

function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function getNextTargetId(currentId) {
    const mapping = {
        'subcategory1': 'subcategory2',
        'subcategory2': 'subcategory3',
        'subcategory3': 'subcategory4',
        'subcategory4': null
    };
    return mapping[currentId];
}

function loadSubcategories(parentId, targetId) {
    const subcategorySelect = document.getElementById(targetId);
    subcategorySelect.innerHTML = ''; // Limpiar opciones previas

    let nextTargetId = getNextTargetId(targetId);
    while (nextTargetId) {
        resetSubcategories(nextTargetId); // Resetea las subcategorías siguientes
        nextTargetId = getNextTargetId(nextTargetId);
    }

    if (!parentId) {
        subcategorySelect.appendChild(new Option('Seleccione una opción', ''));
        return;
    }

    if (subcategoryCache[parentId]) {
        populateSubcategorySelect(subcategoryCache[parentId], subcategorySelect);
    } else {
        fetch(`/get_subcategories/${parentId}`)
            .then(response => response.json())
            .then(data => {
                subcategoryCache[parentId] = data; // Cache the data
                populateSubcategorySelect(data, subcategorySelect);
            })
            .catch(error => {
                console.error('Error:', error);
                subcategorySelect.appendChild(new Option('Error al cargar datos', ''));
            });
    }
}


function populateSubcategorySelect(data, select, selectedId) {
    select.innerHTML = '<option value="">Seleccione una opción</option>';
    data.forEach(subcategory => {
        const option = new Option(subcategory.name, subcategory.id);
        option.selected = (subcategory.id === selectedId);
        select.appendChild(option);
    });
}

function addAttribute() {
    const attributeContainer = document.getElementById('attributeContainer');

    const numberOfAtributtes = attributeContainer.getElementsByClassName('form-row').length;
    if (numberOfAtributtes >= 2) {
        Swal.fire({
            title: 'Advertencia!!',
            text: 'No se pueden añadir más de dos atributos.',
            icon: 'warning',
            confirmButtonText: 'Ok',
            customClass: {
                popup: 'center-alert'
            }
        });
        return;
    }

    const attributeGroup = document.createElement('div');
    attributeGroup.className = 'form-row';

    attributeGroup.innerHTML = `
        <div class="">
            <label for="attribute">Atributo:</label>
            <select name="attribute" class="form-control" onchange="loadAttributeValues(this)">
                <option value="">Seleccione un atributo</option>
                ${Object.keys(attributes).map(attrId => `<option value="${attrId}">${attributes[attrId].name}</option>`).join('')}
            </select>
        </div>
        <div class="col">
            <label for="attribute_values">Valores de Atributo:</label>
            <select name="attribute_values" class="form-control" multiple="multiple" onchange="addPriceFields(this); addReferenceFields(this)">
                <option value="" disabled>Seleccione un valor</option>
            </select>
        </div>
        <div class="col">
            <div class="price_extra_div">
                <label for="attribute_prices">Precios Extra:</label>
                <div name="attribute_prices" class="form-group"></div>
            </div>
            <div class="reference_extra_div">
                <label for="product_code">Referencias Extra:</label>
                <div name="product_code" id="product_code" class="form-group"></div>
            </div>
        </div>
        <div class="">
            <br/>
            <button type="button" class="btn btn-outline-danger mt-2"><i class="bi bi-trash-fill"></i> Eliminar</button>
        </div>
    `;
    attributeContainer.appendChild(attributeGroup);

    $(attributeGroup).find('select[name="attribute_values"]').select2();
}

function isDuplicateAttribute(selectedAttributeId) {
    const attributeSelects = document.querySelectorAll('#attributeContainer select[name="attribute"]');
    let count = 0;
    attributeSelects.forEach(select => {
        if (select.value === selectedAttributeId) {
            count++;
        }
    });
    return count > 1; // Asegura que el atributo seleccionado no exceda más de una selección
}

function loadAttributeValues(select) {
    const attributeId = select.value;
    const valuesSelect = select.parentElement.nextElementSibling.querySelector('select');
    valuesSelect.innerHTML = '';

    if (isDuplicateAttribute(attributeId)) {
        Swal.fire({
            title: 'Error',
            text: 'Este atributo ya ha sido seleccionado.',
            icon: 'error',
            confirmButtonText: 'Ok',
            customClass: {
                popup: 'center-alert'
            }
        });
        select.value = "";
        valuesSelect.innerHTML = '';
        return;
    }

    valuesSelect.innerHTML = ''; // Limpia el select antes de añadir nuevas opciones

    // Añadir opciones de valores de atributo si existen
    if (attributes[attributeId] && attributes[attributeId].values.length > 0) {
        attributes[attributeId].values.forEach(value => {
            const option = document.createElement('option');
            option.value = value.id;
            option.text = value.name;
            valuesSelect.appendChild(option);
        });
    } else {
        // Añadir una opción deshabilitada si no hay valores
        const defaultOption = document.createElement('option');
        defaultOption.textContent = 'Seleccione un valor';
        defaultOption.value = '';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        defaultOption.hidden = true; // mantener oculta
        valuesSelect.appendChild(defaultOption);
    }

    // Refrescar Select2 para manejar los cambios en las opciones
    $(valuesSelect).select2();
    $(valuesSelect).trigger('change');
}

function checkRequiredFields() {
    const productName = document.getElementById('product_name').value.trim();
    const salePrice = document.getElementById('sale_price').value.trim();

    // Comprobar si todos los campos requeridos están llenos
    const allFieldsCompleted = productName !== '' && salePrice !== '';

    // Habilitar o deshabilitar el botón en función de si los campos están completos
    document.getElementById('addAttributeButton').disabled = !allFieldsCompleted;
}

function addPriceFields(select) {
    const attributePricesDiv = select.parentElement.nextElementSibling.querySelector('[name="attribute_prices"]');
    attributePricesDiv.innerHTML = '';
    $(select).find(':selected').each(function() {
        const priceField = document.createElement('input');
        priceField.type = 'number';
        priceField.className = 'form-control mb-2';
        priceField.placeholder = this.text;
        priceField.setAttribute('data-value-id', this.value);
        attributePricesDiv.appendChild(priceField);
    });
}

function addReferenceFields(select) {
    const attributeReferencesDiv = select.parentElement.nextElementSibling.querySelector('[name="product_code"]');
    attributeReferencesDiv.innerHTML = '';
    $(select).find(':selected').each(function() {
        const referenceField = document.createElement('input');
        referenceField.type = 'string';
        referenceField.className = 'form-control mb-2';
        referenceField.placeholder = this.text;
        referenceField.setAttribute('data-value-id', this.value);

        referenceField.addEventListener('input', function() {
            const productCodeInput = document.getElementById('product_code');
            if (this.value.trim()){
                productCodeInput.disabled = true; // Bloquea el campo de código de producto
                productCodeInput.value = ''; // Elimina cualquier cosa que se escribio en el campo
            } else{
                const allReferences = document.querySelectorAll('[name="product_code"] input');
                const anyFilled = Array.from(allReferences).some(input => input.value.trim());
                productCodeInput.disabled = anyFilled;
            }
        });

        attributeReferencesDiv.appendChild(referenceField);
    });
}

function removeAttribute(button) {
    button.closest('.form-row').remove();
}

function addProduct() {
    const productName = document.getElementById('product_name').value.trim();
    const productCode = document.getElementById('product_code').value.trim();
    const categoryName = document.getElementById('category').selectedOptions[0].text;
    const Price = document.getElementById('sale_price').value;

    if (productName === '') {
        Swal.fire({
            title: 'Advertencia',
            text: 'Por favor, ingrese el nombre del producto.',
            icon: 'warning',
            confirmButtonText: 'Ok',
            customClass: {
                popup: 'center-alert'
            }
        });
        return;
    } else if (categoryName === 'Seleccione una opción' || categoryName === '') {
        Swal.fire({
            title: 'Advertencia',
            text: 'Por favor, seleccione al menos una categoría.',
            icon: 'warning',
            confirmButtonText: 'Ok',
            customClass: {
                popup: 'center-alert'
            }
        });
        return;
    } else if (Price === '') {
        Swal.fire({
            title: 'Advertencia',
            text: 'Por favor, añade un precio.',
            icon: 'warning',
            confirmButtonText: 'Ok',
            customClass: {
                popup: 'center-alert'
            }
        });
        return;
    }

    let attributes = Array.from(document.querySelectorAll('#attributeContainer .form-row'))
        .map(attributeGroup => {
            const attribute = attributeGroup.querySelector('[name="attribute"]').value;
            const attributeValues = $(attributeGroup.querySelector('[name="attribute_values"]')).val() || [];
            const attributePrices = Array.from(attributeGroup.querySelector('[name="attribute_prices"]').children).map(priceInput => ({
                id: priceInput.getAttribute('data-value-id'),
                price_extra: parseFloat(priceInput.value) || 0
            }));
            const attributeReferences = Array.from(attributeGroup.querySelector('[name="product_code"]').children).map(referenceInput => ({
                id: referenceInput.getAttribute('data-value-id'),
                reference_extra: referenceInput.value.trim() || productCode.toUpperCase() // Usa el código del producto si no hay referencia
            }));
            return {
                attribute: attribute,
                attribute_values: attributeValues.map(valueId => ({
                    id: valueId,
                    price_extra: attributePrices.find(price => price.id === valueId)?.price_extra || 0,
                    reference_extra: attributeReferences.find(reference => reference.id === valueId)?.reference_extra
                }))
            };
        })
        .filter(attr => attr.attribute_values.length > 0); // Filtra los atributos que no tienen valores seleccionados

    // Reordena los atributos para que los que tienen referencia extra estén al final
    const attributesWithRef = attributes.filter(attr => attr.attribute_values.some(av => av.reference_extra && av.reference_extra !== productCode.toUpperCase()));
    const attributesWithoutRef = attributes.filter(attr => !attr.attribute_values.some(av => av.reference_extra && av.reference_extra !== productCode.toUpperCase()));
    attributes = attributesWithoutRef.concat(attributesWithRef);

    const product = {
        product_name: productName,
        product_code: productCode,
        category: document.getElementById('category').value ? document.getElementById('category').value : '',
        subcategories: [
            document.getElementById('subcategory1').value && document.getElementById('subcategory1').selectedOptions[0].text !== 'No hay más subcategorías' ? document.getElementById('subcategory1').value : '',
            document.getElementById('subcategory2').value && document.getElementById('subcategory2').selectedOptions[0].text !== 'No hay más subcategorías' ? document.getElementById('subcategory2').value : '',
            document.getElementById('subcategory3').value && document.getElementById('subcategory3').selectedOptions[0].text !== 'No hay más subcategorías' ? document.getElementById('subcategory3').value : '',
            document.getElementById('subcategory4').value && document.getElementById('subcategory4').selectedOptions[0].text !== 'No hay más subcategorías' ? document.getElementById('subcategory4').value : ''
        ].filter(id => id),
        sale_price: parseFloat(Price),
        attributes: attributes,
        category_name: categoryName,
        subcategory_names: [
            document.getElementById('subcategory1').selectedOptions[0]?.text !== 'No hay más subcategorías' ? document.getElementById('subcategory1').selectedOptions[0]?.text : '',
            document.getElementById('subcategory2').selectedOptions[0]?.text !== 'No hay más subcategorías' ? document.getElementById('subcategory2').selectedOptions[0]?.text : '',
            document.getElementById('subcategory3').selectedOptions[0]?.text !== 'No hay más subcategorías' ? document.getElementById('subcategory3').selectedOptions[0]?.text : '',
            document.getElementById('subcategory4').selectedOptions[0]?.text !== 'No hay más subcategorías' ? document.getElementById('subcategory4').selectedOptions[0]?.text : ''
        ],
        attribute_names: Array.from(document.querySelectorAll('#attributeContainer .form-row')).map(attributeGroup => {
            const attributeName = attributeGroup.querySelector('[name="attribute"]').selectedOptions[0].text;
            const attributeValuesNames = $(attributeGroup.querySelector('[name="attribute_values"]')).find(':selected').toArray().map(option => option.text);
            return {
                attributeName: attributeName,
                attribute_values: attributeValuesNames
            };
        })
    };

    products.push(product);

    updateProductList();
    $('#productModal').modal('hide');
    document.getElementById('productForm').reset();
    document.getElementById('attributeContainer').innerHTML = '';
}

function updateProductList() {
    const productList = document.getElementById('productList');
    productList.innerHTML = '';

    let showReferenceInternals = false;
    let showRefAndPrices = false;
    let showAttributes = false;

    for (const product of products) {
        if (product.product_code && product.product_code.trim().length > 0) {
            showReferenceInternals = true;
        }
        for (const attr of product.attributes) {
            if (attr.attribute_values.some(av => av.reference_extra && av.reference_extra !== 'N/A' || av.price_extra && av.price_extra !== 0)) {
                showRefAndPrices = true;
            }
        }
        if (product.attribute_names.length > 0) {
            showAttributes = true;
        }
    }

    products.forEach((product, index) => {
        const categoryPath = [product.category_name, ...(product.subcategory_names || [])].filter(Boolean).filter(name => name !== 'Seleccione una opción').join(' / ');

        const attributesDisplay = (product.attribute_names || []).map(attr => {
            return attr.attribute_values.length > 0 ? `${attr.attributeName}: ${attr.attribute_values.join(', ')}` : '';
        }).filter(attrDisplay => attrDisplay !== '').join('; ');

        const refAndPricesDisplay = product.attributes.map(attr => {
            const attributeValuesDetails = attr.attribute_values.map(av => {
                const refExtra = av.reference_extra && av.reference_extra !== 'N/A' ? `<li>Referencia Extra: ${av.reference_extra}</li>` : '';
                const priceExtra = av.price_extra && av.price_extra !== 0 ? `<li>Precio Extra: S/.${av.price_extra.toFixed(2)}</li>` : '';
                return [refExtra, priceExtra].filter(detail => detail).join('');
            }).join('');
            return attributeValuesDetails ? `<ul>${attributeValuesDetails}</ul>` : '';
        }).join(' ');

        let rowContent = `
            <td>${product.product_name}</td>
            <td>${categoryPath}</td>
            <td>S/. ${product.sale_price.toFixed(2)}</td>
        `;

        if (showReferenceInternals) {
            rowContent += `<td>${product.product_code || ''}</td>`;
        }

        if (showRefAndPrices) {
            rowContent += `<td>${refAndPricesDisplay}</td>`;
        }

        if (showAttributes) {
            rowContent += `<td>${attributesDisplay}</td>`;
        }

        rowContent += `
            <td>
                <button class="btn btn-info btn-sm" data-toggle="modal" data-target="#editProductModal" onclick="editProduct(${index})"><i class="bi bi-pencil-square"></i></button>
                <button class="btn btn-secondary btn-sm" onclick="duplicateProduct(${index})"><i class="bi bi-files"></i></button>
                <button class="btn btn-danger btn-sm" onclick="removeProduct(${index})"><i class="bi bi-trash"></i></button>
            </td>
        `;

        const productRow = document.createElement('tr');
        productRow.innerHTML = rowContent;
        productList.appendChild(productRow);
    });

    // Ajustar la visibilidad de las cabeceras de las columnas
    document.getElementById('internalRefHeader').style.display = showReferenceInternals ? '' : 'none';
    document.getElementById('extrasRefHeader').style.display = showRefAndPrices ? '' : 'none';
    document.getElementById('attributesValuesHeader').style.display = showAttributes ? '' : 'none';
}

function editProduct(index) {
    editingIndex = index;
    const product = products[index];

    document.getElementById('edit_product_name').value = product.product_name;
    document.getElementById('edit_sale_price').value = product.sale_price.toFixed(2);
    document.getElementById('edit_product_code').value = product.product_code;

    const categorySelect = document.getElementById('edit_category');
    categorySelect.onchange = () => {
        loadSubcategoriesRecursively(0, categorySelect.value, []);
    };

    populateCategoriesEdit(() => {
        categorySelect.value = product.category;
        loadSubcategoriesRecursively(0, product.category, product.subcategories);
    });

    const attributeContainer = document.getElementById('edit_attributeContainer');
    attributeContainer.innerHTML = '';
    product.attributes.forEach(attr => {
        addEditAttribute(attr);
    });

    $('#editProductModal').modal('show');
}

function loadSubcategoriesRecursively(level, parentId, subcategories) {
    const targetId = `edit_subcategory${level + 1}`;

    // Restablecer todas las subcategorías siguientes antes de cargar la nueva
    for (let i = level + 1; i <= 4; i++) {
        const subId = `edit_subcategory${i}`;
        document.getElementById(subId).innerHTML = '<option value="">Seleccione una opción</option>';
    }

    // Cargar la subcategoría actual y configurar el siguiente nivel, si procede
    if (level < 4) {
        loadSubcategoriesEdit(parentId, targetId, subcategories[level], () => {
            if (level + 1 < subcategories.length) {
                loadSubcategoriesRecursively(level + 1, subcategories[level], subcategories);
            }
        });
    }
}

function loadSubcategoriesEdit(parentId, targetId, selectedId, callback) {
    const subcategorySelect = document.getElementById(targetId);
    subcategorySelect.innerHTML = '<option value="">Seleccione una opción</option>';

    if (!parentId) {
        if (callback) callback();
        return;
    }

    if (subcategoryCache[parentId]) {
        populateSubcategorySelect(subcategoryCache[parentId], subcategorySelect, selectedId);
        setupSubcategoryChangeEvent(targetId);
        if (callback) callback();
    } else {
        fetch(`/get_subcategories/${parentId}`)
            .then(response => response.json())
            .then(data => {
                subcategoryCache[parentId] = data;
                populateSubcategorySelect(data, subcategorySelect, selectedId);
                setupSubcategoryChangeEvent(targetId);
                if (callback) callback();
            })
            .catch(error => {
                console.error('Error:', error);
                subcategorySelect.appendChild(new Option('Error al cargar datos', ''));
                if (callback) callback();
            });
    }
}

function setupSubcategoryChangeEvent(targetId) {
    const selectElement = document.getElementById(targetId);
    const nextTargetId = getNextTargetId(targetId);
    if (nextTargetId) {
        selectElement.onchange = () => {
            // Restablecer y cargar la siguiente subcategoría cuando se selecciona una opción
            loadSubcategories(selectElement.value, nextTargetId);
        };
    }
}

function populateCategoriesEdit(callback) {
    const categorySelect = document.getElementById('edit_category');
    categorySelect.innerHTML = '<option value="">Seleccione una opción</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.text = category.name;
        categorySelect.appendChild(option);
    });
    if (callback) callback();
}

function addEditAttribute(attributeData) {
    const attributeContainer = document.getElementById('edit_attributeContainer');
    const attributeGroup = document.createElement('div');
    attributeGroup.className = 'form-row';
    attributeContainer.appendChild(attributeGroup);

    attributeGroup.innerHTML = `
        <div class="">
            <label for="attribute">Atributo:</label>
            <select name="attribute" class="form-control" onchange="loadAttributeValues(this)">
                ${Object.keys(attributes).map(attrId => `<option value="${attrId}" ${attrId === attributeData.attribute ? 'selected' : ''}>${attributes[attrId].name}</option>`).join('')}
            </select>
        </div>
        <div class="col">
            <label for="attribute_values">Valores de Atributo:</label>
            <select name="attribute_values" class="form-control" multiple="multiple">
                <!-- valores se cargarán mediante loadAttributeValues -->
            </select>
        </div>
        <div class="col">
            <label for="attribute_prices">Precios Extra:</label>
            <div name="attribute_prices" class="form-group">
                <!-- precios se cargarán dinámicamente -->
            </div>
        </div>
        <div class="col">
            <label for="product_code">Referencias Extra:</label>
            <div name="product_code" class="form-group">
                <!-- referencias se cargarán dinámicamente -->
            </div>
        </div>
        <div class="">
            <button type="button" class="btn btn-outline-danger mt-2" onclick="removeAttribute(this)"><i class="bi bi-trash-fill"></i> Eliminar</button>
        </div>
    `;

    // Cargar valores de atributo seleccionados y precios adicionales
    loadAttributeValuesForEdit(attributeGroup.querySelector('select[name="attribute"]'), attributeData);
}

function loadAttributeValuesForEdit(select, attributeData) {
    const attributeId = select.value;
    const valuesSelect = select.parentElement.nextElementSibling.querySelector('select[name="attribute_values"]');
    valuesSelect.innerHTML = '';

    if (isDuplicateAttribute(attributeId)) {
        Swal.fire({
            title: 'Error',
            text: 'Este atributo ya ha sido seleccionado.',
            icon: 'error',
            confirmButtonText: 'Ok',
            customClass: {
                popup: 'center-alert'
            }
        });
        select.value = ""; // Reset the value to not selected
        return;
    }

    // Asegúrate de que los datos del atributo existan antes de intentar acceder a ellos
    if (attributes[attributeId] && attributes[attributeId].values) {
        attributes[attributeId].values.forEach(value => {
            const isSelected = attributeData.values.some(v => v.id === value.id);
            const option = new Option(value.name, value.id, isSelected, isSelected);
            valuesSelect.appendChild(option);
        });
    } else {
        // Si no hay valores disponibles para el atributo
        valuesSelect.appendChild(new Option('No hay valores disponibles', '', true, true));
    }

    $(valuesSelect).select2(); // Inicializa select2 para el nuevo contenido
    setupExtraFieldsForEdit(valuesSelect, attributeData); // Configura los campos extras
}

function setupExtraFieldsForEdit(valuesSelect, attributeData) {
    const pricesDiv = valuesSelect.parentElement.nextElementSibling.querySelector('[name="attribute_prices"]');
    const referencesDiv = valuesSelect.parentElement.nextElementSibling.querySelector('[name="product_code"]');
    pricesDiv.innerHTML = '';
    referencesDiv.innerHTML = '';

    // Iterar sobre cada valor de atributo y establecer campos de entrada para precios y referencias
    attributeData.values.forEach(val => {
        // Precios extras
        const priceInput = document.createElement('input');
        priceInput.type = 'number';
        priceInput.className = 'form-control mb-2';
        priceInput.value = val.price_extra || 0;
        priceInput.setAttribute('data-value-id', val.id);
        pricesDiv.appendChild(priceInput);

        // Referencias extras
        const referenceInput = document.createElement('input');
        referenceInput.type = 'text';
        referenceInput.className = 'form-control mb-2';
        referenceInput.value = val.reference_extra || '';
        referenceInput.setAttribute('data-value-id', val.id);
        referencesDiv.appendChild(referenceInput);
    });
}

function updateProduct() {
    if (editingIndex === null) return;

    const editedProduct = products[editingIndex];
    editedProduct.product_name = document.getElementById('edit_product_name').value;
    editedProduct.sale_price = parseFloat(document.getElementById('edit_sale_price').value);
    editedProduct.product_code = document.getElementById('edit_product_code').value;

    // Actualizar categoría y subcategorías
    editedProduct.category = document.getElementById('edit_category').value;
    editedProduct.category_name = document.getElementById('edit_category').selectedOptions[0].text;
    editedProduct.subcategories = [
        document.getElementById('edit_subcategory1').value,
        document.getElementById('edit_subcategory2').value,
        document.getElementById('edit_subcategory3').value,
        document.getElementById('edit_subcategory4').value
    ].filter(sub => sub !== '');
    editedProduct.subcategory_names = [
        document.getElementById('edit_subcategory1').selectedOptions[0]?.text,
        document.getElementById('edit_subcategory2').selectedOptions[0]?.text,
        document.getElementById('edit_subcategory3').selectedOptions[0]?.text,
        document.getElementById('edit_subcategory4').selectedOptions[0]?.text
    ].filter(name => name && name !== 'Seleccione una opción');

    editedProduct.attributes = Array.from(document.querySelectorAll('#edit_attributeContainer .form-row')).map(attrRow => {
        return {
            attribute: attrRow.querySelector('select[name="attribute"]').value,
            values: $(attrRow.querySelector('select[name="attribute_values"]')).val(),
            prices: Array.from(attrRow.querySelector('[name="attribute_prices"]').children).map(input => ({
                id: input.getAttribute('data-value-id'),
                value: parseFloat(input.value) || 0
            })),
            references: Array.from(attrRow.querySelector('[name="product_code"]').children).map(input => ({
                id: input.getAttribute('data-value-id'),
                value: input.value
            }))
        };
    });

    updateProductList();
    $('#editProductModal').modal('hide');
}

function duplicateProduct(index) {
    // Lógica para duplicar el producto y agregarlo a la lista
    const product = products[index];
    const newProduct = {...product}; // Crear una copia superficial del producto
    products.push(newProduct);
    updateProductList(); // Actualizar la lista con el nuevo producto duplicado
}

function removeProduct(index) {
    products.splice(index, 1);
    updateProductList();
}

function registerProducts() {
    const productsToSend = products.map(product => ({
        product_name: product.product_name,
        product_code: product.product_code,
        category: product.category,
        subcategories: product.subcategories,
        sale_price: product.sale_price,
        attributes: product.attributes
    }));

    fetch('/register_product', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(productsToSend)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('Error: ' + data.error);
        } else {
            alert('Productos registrados con éxito');
            products = [];
            updateProductList();
            showProductLinks(data.product_ids);
        }
    })
    .catch(error => console.error('Error:', error));
    //console.log(JSON.stringify(productsToSend));
}

function showProductLinks(productIds) {
    const linksContainer = document.getElementById('productLinks');
    linksContainer.innerHTML = '';  // Limpiar enlaces anteriores

    productIds.forEach(id => {
        const link = document.createElement('a');
        link.href = `https://kdoshstoreproof.odoo.com/odoo/action-704/${id}?cids=1-2`;
        link.textContent = 'Ver Producto ' + id;
        link.target = '_blank';
        linksContainer.appendChild(link);
        linksContainer.appendChild(document.createElement('br'));
    });

    $('#productLinksModal').modal('show');
}

function redirectToOrderPage() {
    let productIds = collectProductIds();
    window.location.href = `/ordenes?productIds=${productIds.join(',')}`;
}

function collectProductIds() {
    let productIds = [];
    const productEntries = document.querySelectorAll('.product-entry'); // Asegúrate de que tus productos tienen esta clase
    productEntries.forEach(entry => {
        productIds.push(entry.dataset.productId); // Asegúrate de que cada producto tiene un data-productId
    });
    return productIds;
}

document.getElementById('createOrderButton').addEventListener('click', redirectToOrderPage);