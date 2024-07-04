let products = [];
let attributes = {};

document.addEventListener('DOMContentLoaded', function () {
    $('#productModal').on('show.bs.modal', function () {
        // Restablecer formulario completamente
        document.getElementById('productForm').reset();
        document.getElementById('attributeContainer').innerHTML = ''; // Limpia los atributos dinámicos
        ['subcategory1', 'subcategory2', 'subcategory3', 'subcategory4'].forEach(resetSubcategories);

        fetch('/get_categories')
            .then(response => response.json())
            .then(data => {
                const categorySelect = document.getElementById('category');
                categorySelect.innerHTML = '<option value="">Seleccione una opción</option>';
                data.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.text = category.name;
                    categorySelect.appendChild(option);
                });
            })
            .catch(error => console.error('Error:', error));

        fetch('/get_attributes')
            .then(response => response.json())
            .then(data => {
                attributes = data;
            })
            .catch(error => console.error('Error:', error));
    });
});

function resetSubcategories(targetId) {
    const subcategorySelect = document.getElementById(targetId);
    subcategorySelect.innerHTML = '<option value="">Seleccione una opción</option>';
    subcategorySelect.disabled = true;
}

function getNextTargetId(currentId) {
    const mapping = {
        'subcategory1': 'subcategory2',
        'subcategory2': 'subcategory3',
        'subcategory3': 'subcategory4',
        'subcategory4': null // No next target after subcategory4
    };
    return mapping[currentId];
}

function loadSubcategories(parentId, targetId) {
    const subcategorySelect = document.getElementById(targetId);
    subcategorySelect.innerHTML = ''; // Limpiar opciones previas
    subcategorySelect.disabled = true; // Deshabilitar hasta que se carguen las opciones

    // Restablecer todas las subcategorías subsiguientes
    let nextTargetId = getNextTargetId(targetId);
    while (nextTargetId) {
        resetSubcategories(nextTargetId);
        nextTargetId = getNextTargetId(nextTargetId);
    }

    // Si no hay parentId seleccionado, deshabilita el select y no hace más
    if (!parentId) {
        subcategorySelect.appendChild(new Option('Seleccione una opción', ''));
        return;
    }

    fetch(`/get_subcategories/${parentId}`)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                // Añade una opción predeterminada que no es seleccionable
                const defaultOption = new Option('Seleccione una opción', '', true, true);
                defaultOption.disabled = true;
                subcategorySelect.appendChild(defaultOption);

                // Agrega subcategorías como opciones seleccionables
                data.forEach(subcategory => {
                    const option = new Option(subcategory.name, subcategory.id);
                    subcategorySelect.appendChild(option);
                });
                subcategorySelect.disabled = false;
            } else {
                // Maneja el caso cuando no hay subcategorías
                subcategorySelect.appendChild(new Option('No hay más subcategorías', '', true, true));
                subcategorySelect.children[0].disabled = true;
            }

            // Configura el evento onchange para la subcategoría actual
            subcategorySelect.onchange = () => {
                const nextId = getNextTargetId(targetId);
                if (nextId) loadSubcategories(subcategorySelect.value, nextId);
            };
        })
        .catch(error => {
            console.error('Error:', error);
            subcategorySelect.appendChild(new Option('Error al cargar datos', '', true, true));
            subcategorySelect.children[0].disabled = true;
        });
}

function addAttribute() {
    const attributeContainer = document.getElementById('attributeContainer');
    const attributeGroup = document.createElement('div');
    attributeGroup.className = 'form-row';

    attributeGroup.innerHTML = `
        <div class="col">
            <label for="attribute">Atributo:</label>
            <select name="attribute" class="form-control" onchange="loadAttributeValues(this)">
                <option value="" disabled>Seleccione un atributo</option>
                ${Object.keys(attributes).map(attrId => `<option value="${attrId}">${attributes[attrId].name}</option>`).join('')}
            </select>
        </div>
        <div class="col">
            <label for="attribute_values">Valores de Atributo:</label>
            <select name="attribute_values" class="form-control" multiple="multiple" onchange="addPriceFields(this)">
                <option value="" disabled>Seleccione un valor</option>
            </select>
        </div>
        <div class="col">
            <label for="attribute_prices">Precios Extra:</label>
            <div name="attribute_prices" class="form-group"></div>
        </div>
        <div class="col">
            <br/>
            <button type="button" class="btn btn-outline-danger mt-2" onclick="removeAttribute(this)"><i class="bi bi-trash-fill"></i> Eliminar</button>
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
        priceField.placeholder = 'Precio Extra para ' + this.text;
        priceField.setAttribute('data-value-id', this.value);
        attributePricesDiv.appendChild(priceField);
    });
}

function removeAttribute(button) {
    button.parentElement.parentElement.remove();
}

function addProduct() {
    const product = {
        product_name: document.getElementById('product_name').value,
        category: document.getElementById('category').value ? document.getElementById('category').value : '',
        subcategories: [
            document.getElementById('subcategory1').value && document.getElementById('subcategory1').selectedOptions[0].text !== 'No hay más subcategorías' ? document.getElementById('subcategory1').value : '',
            document.getElementById('subcategory2').value && document.getElementById('subcategory2').selectedOptions[0].text !== 'No hay más subcategorías' ? document.getElementById('subcategory2').value : '',
            document.getElementById('subcategory3').value && document.getElementById('subcategory3').selectedOptions[0].text !== 'No hay más subcategorías' ? document.getElementById('subcategory3').value : '',
            document.getElementById('subcategory4').value && document.getElementById('subcategory4').selectedOptions[0].text !== 'No hay más subcategorías' ? document.getElementById('subcategory4').value : ''
        ],
        sale_price: parseFloat(document.getElementById('sale_price').value),
        attributes: Array.from(document.querySelectorAll('#attributeContainer .form-row')).map(attributeGroup => {
            const attribute = attributeGroup.querySelector('[name="attribute"]').value;
            const attributeValues = $(attributeGroup.querySelector('[name="attribute_values"]')).val();
            const attributePrices = Array.from(attributeGroup.querySelector('[name="attribute_prices"]').children).map(priceInput => ({
                id: priceInput.getAttribute('data-value-id'),
                price_extra: parseFloat(priceInput.value) || 0
            }));
            return {
                attribute: attribute,
                attribute_values: attributeValues.map((value, index) => ({
                    id: value,
                    price_extra: attributePrices.find(price => price.id === value)?.price_extra || 0
                }))
            };
        }),
        category_name: document.getElementById('category').selectedOptions[0].text,
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
    products.forEach((product, index) => {
        const categoryPath = [product.category_name, ...product.subcategory_names].filter(Boolean).filter(name => name !== 'Seleccione una opción').join(' / ');
        const attributesDisplay = product.attribute_names.map(attr => {
            return `${attr.attributeName}: ${attr.attribute_values.join(', ')}`;
        }).join('; ');
        const productRow = document.createElement('tr');
        productRow.innerHTML = `
            <td>${product.product_name}</td>
            <td>${categoryPath}</td>
            <td>${product.sale_price}</td>
            <td>${attributesDisplay}</td>
            <td><button class="btn btn-danger btn-sm" onclick="removeProduct(${index})">Eliminar</button></td>
        `;
        productList.appendChild(productRow);
    });
}

function removeProduct(index) {
    products.splice(index, 1);
    updateProductList();
}

function registerProducts() {
    const productsToSend = products.map(product => ({
        product_name: product.product_name,
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
        }
    })
    .catch(error => console.error('Error:', error));
}