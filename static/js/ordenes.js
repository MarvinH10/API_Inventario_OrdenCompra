let orders = [];
let currentSupplier = null;
let productVariantsCache = {};
let suppliers = [];  // Almacenar proveedores
let mainProducts = [];  // Almacenar productos principales

document.addEventListener('DOMContentLoaded', function () {
    cargarDatosIniciales();  // Nueva función para cargar todos los datos necesarios

    $('#supplierModal').on('show.bs.modal', function () {
        loadSuppliers();
    });

    $('#productModal').on('show.bs.modal', function () {
        document.getElementById('productForm').reset();
        document.getElementById('product_variants').innerHTML = '';
        document.getElementById('product_variants_price').innerHTML = '';
        loadMainProducts();
    });

    document.getElementById('addProductButton').addEventListener('click', function () {
        openProductModal();
    });

    document.getElementById('order_product').addEventListener('change', function () {
        const productId = this.value;
        if (productId && !productVariantsCache[productId]) {
            fetch(`/get_product_variants/${productId}`)
                .then(response => response.json())
                .then(variants => {
                    productVariantsCache[productId] = variants;
                    populateProductVariants(variants);
                })
                .catch(error => console.error('Error loading product variants:', error));
        } else if (productId) {
            populateProductVariants(productVariantsCache[productId]);
        }
    });
});

function cargarDatosIniciales() {
    showLoading();
    Promise.all([
        fetch('/get_categories').then(response => response.json()),
        fetch('/get_attributes').then(response => response.json()),
        fetch('/get_suppliers').then(response => response.json()),
        fetch('/get_main_products').then(response => response.json()),

    ]).then(([categoriesData, attributesData, suppliersData, mainProductsData]) => {
        categories = categoriesData;
        attributes = attributesData;
        suppliers = suppliersData;
        mainProducts = mainProductsData;

        populateSuppliers();
        populateMainProducts();

        hideLoading();
    }).catch(error => {
        console.error('Error loading initial data:', error);
        hideLoading();
    });
}

function populateSuppliers() {
    const supplierSelect = document.getElementById('supplier_name');
    supplierSelect.innerHTML = '<option value="">Seleccione un proveedor</option>';
    suppliers.forEach(supplier => {
        const option = new Option(supplier.name, supplier.id);
        supplierSelect.appendChild(option);
    });
}

function populateMainProducts() {
    const productSelect = document.getElementById('order_product');
    productSelect.innerHTML = '<option value="">Seleccione un producto</option>';
    mainProducts.forEach(product => {
        const option = new Option(product.name, product.id);
        productSelect.appendChild(option);
    });
}

function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function openProductModal() {
    $('#productModal').modal('show');
}

function loadSuppliers() {
    fetch('/get_suppliers')
        .then(response => response.json())
        .then(data => {
            const supplierSelect = document.getElementById('supplier_name');
            supplierSelect.innerHTML = '';
            data.forEach(supplier => {
                const option = document.createElement('option');
                option.value = supplier.id;
                option.text = supplier.name;
                supplierSelect.appendChild(option);
            });
        })
        .catch(error => console.error('Error:', error));
}

function saveSupplier() {
    const supplierId = document.getElementById('supplier_name').value;
    const supplierReference = document.getElementById('supplier_reference').value.trim();

    if (supplierId === '' || supplierReference === '') {
        swal({
            title: "Necesario!",
            text: "Por favor, complete todos los campos.",
            icon: "warning",
            button: "OK",
        });
        return;
    }

    currentSupplier = {
        supplier_id: parseInt(supplierId, 10),
        supplier_name: document.getElementById('supplier_name').selectedOptions[0].text,
        supplier_reference: supplierReference
    };

    updateSupplierInfo();
    $('#supplierModal').modal('hide');
}

function updateSupplierInfo() {
    const supplierInfo = document.getElementById('supplier-info');
    supplierInfo.innerHTML = `
        <button type="button" class="btn btn-outline-secondary" data-toggle="modal" data-target="#supplierModal">
            <i class="bi bi-pencil"></i> ${currentSupplier.supplier_name} (${currentSupplier.supplier_reference})
        </button>
    `;
    document.getElementById('addProductButton').disabled = false;
}

function loadMainProducts() {
    fetch('/get_main_products')
        .then(response => response.json())
        .then(data => {
            const productSelect = document.getElementById('order_product');
            productSelect.innerHTML = '<option value="">Seleccione un producto</option>';
            data.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.text = product.name;
                productSelect.appendChild(option);
            });
        })
        .catch(error => console.error('Error:', error));
}

function loadProductVariants(productId) {
    fetch(`/get_product_variants/${productId}`)
        .then(response => response.json())
        .then(data => {
            productVariantsCache[productId] = data;
            populateProductVariants(data);
            //console.log(data)
        })
        .catch(error => console.error('Error:', error));
}

function populateProductVariants(variants) {
    const variantContainer = document.getElementById('product_variants');
    const variantContainerPrice = document.getElementById('product_variants_price');

    variantContainer.innerHTML = '';
    variantContainerPrice.innerHTML = '';

    if (variants.length === 0) {
        variantContainer.innerHTML = "<p>No hay variantes disponibles.</p>";
        variantContainerPrice.innerHTML = "<p>No hay variantes disponibles.</p>";
        return;
    }

    let tableHtmlQuantity = '<table class="table">';
    let tableHtmlPrice = '<table class="table">';

    // Caso especial para productos sin atributos
    if (variants.every(variant => !variant.attributes || variant.attributes.length === 0)) {
        tableHtmlQuantity += '<thead><tr><th>Producto</th><th>Cantidad</th></tr></thead><tbody>';
        tableHtmlPrice += '<thead><tr><th>Producto</th><th>Precio</th></tr></thead><tbody>';

        tableHtmlQuantity += `<tr>
            <td>Producto General</td>
            <td><input type="number" class="form-control no-spinners" id="general_quantity" placeholder="Cantidad"></td>
        </tr>`;
        tableHtmlPrice += `<tr>
            <td>Producto General</td>
            <td><input type="number" class="form-control no-spinners" id="general_price" placeholder="Precio"></td>
        </tr>`;
    } else {
        // Preparación de las filas y columnas según los atributos
        const rowAttributes = new Set();
        const columnAttributes = new Set();

        variants.forEach(variant => {
            if (variant.attributes && variant.attributes.length > 0) {
                rowAttributes.add(variant.attributes[0]);
                if (variant.attributes.length > 1) {
                    columnAttributes.add(variant.attributes[1]);
                }
            }
        });

        if (columnAttributes.size === 0 && rowAttributes.size > 0) {
            columnAttributes.add('Detalle');
        }

        const rows = Array.from(rowAttributes).sort();
        const columns = Array.from(columnAttributes).sort();

        tableHtmlQuantity += '<thead><tr><th></th>';
        tableHtmlPrice += '<thead><tr><th></th>';
        columns.forEach(col => {
            tableHtmlQuantity += `<th>${col}</th>`;
            tableHtmlPrice += `<th>${col}</th>`;
        });
        tableHtmlQuantity += '</tr></thead><tbody>';
        tableHtmlPrice += '</tr></thead><tbody>';

        rows.forEach(row => {
            tableHtmlQuantity += `<tr><th>${row}</th>`;
            tableHtmlPrice += `<tr><th>${row}</th>`;
            columns.forEach(col => {
                const matchingVariant = variants.find(v => v.attributes.includes(row) && (!v.attributes[1] || v.attributes[1] === col));
                if (matchingVariant) {
                    tableHtmlQuantity += `<td><input type="number" class="form-control no-spinners" id="variant_${matchingVariant.id}_quantity" placeholder="Cantidad"></td>`;
                    tableHtmlPrice += `<td><input type="number" class="form-control no-spinners" id="variant_${matchingVariant.id}_price" placeholder="Precio"></td>`;
                } else {
                    tableHtmlQuantity += '<td></td>';
                    tableHtmlPrice += '<td></td>';
                }
            });
            tableHtmlQuantity += '</tr>';
            tableHtmlPrice += '</tr>';
        });
    }
    tableHtmlQuantity += '</tbody></table>';
    tableHtmlPrice += '</tbody></table>';

    variantContainer.innerHTML = tableHtmlQuantity;
    variantContainerPrice.innerHTML = tableHtmlPrice;
}

function addProductorder() {
    const productId = document.getElementById('order_product').value;
    const productName = document.getElementById('order_product').selectedOptions[0].text;
    const variants = [];

    // Comprobar si estamos en el caso especial de "Producto General"
    const generalQuantity = document.getElementById('general_quantity');
    const generalPrice = document.getElementById('general_price');

    if (generalQuantity && generalPrice) {
        const quantity = generalQuantity.value.trim();
        const price = generalPrice.value.trim();

        if (quantity > 0 && price > 0) {
            variants.push({
                id: productId, // Usar el ID del producto en general, ya que no hay variantes específicas
                quantity,
                price,
                name: productName,
                attributes: 'Ninguno' // Indicar que no hay atributos
            });
        }
    } else {
        // Procesar variantes con atributos
        const rows = document.querySelectorAll('#product_variants tbody tr');
        const rowsPrice = document.querySelectorAll('#product_variants_price tbody tr');

        rows.forEach((row, index) => {
            const quantityInputs = row.querySelectorAll('input');
            const priceInputs = rowsPrice[index].querySelectorAll('input');
            const rowAttribute = row.cells[0].textContent.trim();

            quantityInputs.forEach((input, idx) => {
                const quantity = input.value.trim();
                const price = priceInputs[idx].value.trim();
                const id = input.id.split('_')[1];
                const attributesTh = document.querySelector('#product_variants thead tr th:nth-child(' + (idx + 2) + ')');
                const columnAttribute = attributesTh ? attributesTh.textContent.trim() : 'Ninguno';

                let attributesDescription = '';
                if (rowAttribute !== 'Ninguno' && columnAttribute !== 'Ninguno' && columnAttribute !== 'Detalle') {
                    attributesDescription = `${rowAttribute}, ${columnAttribute}`;
                } else if (rowAttribute !== 'Ninguno') {
                    attributesDescription = rowAttribute; // Solo atributo de fila
                }

                if (quantity > 0 && price > 0) {
                    variants.push({
                        id,
                        quantity,
                        price,
                        name: productName,
                        attributes: attributesDescription // Descripción de atributos según las validaciones
                    });
                }
            });
        });
    }

    if (productId === '' || variants.length === 0) {
        alert('Por favor, complete todos los campos relevantes.');
        return;
    }

    const order = {
        supplier_id: currentSupplier.supplier_id,
        supplier_reference: currentSupplier.supplier_reference,
        product_id: parseInt(productId, 10),
        product_name: productName,
        variants: variants.map(v => ({ variant_id: parseInt(v.id, 10), quantity: parseInt(v.quantity, 10), price_unit: parseFloat(v.price), name: v.name, attributes: v.attributes }))
    };

    orders.push(order);
    document.getElementById('productForm').reset();
    $('#productModal').modal('hide');
    updateOrderList();
}

function updateOrderList() {
    const orderList = document.getElementById('orderList');
    let totalPrice = 0;
    orderList.innerHTML = '';

    orders.forEach((order, index) => {
        order.variants.forEach(variant => {
            console.log(variant);
            const orderRow = document.createElement('tr');
            orderRow.innerHTML = `
                <td>${variant.name} (${variant.attributes})</td>
                <td>${variant.quantity}</td>
                <td>S/. ${variant.price_unit.toFixed(2)}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="removeOrder(${index})"><i class="bi bi-trash"></i></button>
                </td>
            `;
            orderList.appendChild(orderRow);
            totalPrice += variant.quantity * variant.price_unit;
        });
    });

    document.getElementById('totalPrice').textContent = 'S/. ' + totalPrice.toFixed(2);
}

function removeOrder(index) {
    orders.splice(index, 1);
    updateOrderList();
}

function registerOrders() {
    fetch('/register_order', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orders)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('Error: ' + data.error);
        } else if (data.order_ids) {
            const orderIds = data.order_ids;
            const odooUrlBase = 'https://kdoshstoreproof.odoo.com/odoo/purchase/';
            const orderLinks = orderIds.map(id => `<a href="${odooUrlBase}${id}?debug=1&cids=1-2" target="_blank">Orden ${id}</a>`).join('<br>');
            showModal('Órdenes registradas con éxito', `Las siguientes órdenes fueron registradas con éxito:<br>${orderLinks}`);
            orders = [];
            updateOrderList();
        } else {
            alert('No se recibieron IDs de órdenes del servidor.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Hubo un error al registrar las órdenes. Por favor, inténtelo de nuevo.');
    });
}

function showModal(title, message) {
    const modalHtml = `
        <div class="modal fade" id="confirmationModal" tabindex="-1" role="dialog" aria-labelledby="confirmationModalLabel" aria-hidden="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="confirmationModalLabel">${title}</h5>
                        <button id="closebuttonModaladdProduct" type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${message}
                    </div>
                    <div class="modal-footer">
                        <button id="closebuttonModaladdProduct" type="button" class="btn btn-secondary" data-dismiss="modal">Cerrar sin perder datos Proveedor</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    $('#confirmationModal').modal('show');

    $('#confirmationModal').on('shown.bs.modal', function() {
        document.getElementById('closebuttonModaladdProduct').addEventListener('click', function() {
            window.location.reload();
        });
    });
    $('#confirmationModal').on('hidden.bs.modal', function() {
        $(this).remove();
    });
}

document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('keydown', function (event) {
        if ((event.ctrlKey && event.shiftKey) || (event.altKey && event.shiftKey)) {
            const inputFocused = document.activeElement;
            if (inputFocused.tagName === 'INPUT' && inputFocused.type === 'number') {
                event.preventDefault(); // Prevenir el comportamiento predeterminado de las teclas flecha arriba/abajo
                setTimeout(() => {
                    const table = inputFocused.closest('table');
                    const inputs = Array.from(table.querySelectorAll('input[type="number"]'));
                    const currentIndex = inputs.indexOf(inputFocused);
                    const rowCount = table.querySelectorAll('tbody tr').length;
                    const columnCount = inputs.length / rowCount;
                    const currentRow = Math.floor(currentIndex / columnCount);
                    const currentColumn = currentIndex % columnCount;

                    if (event.ctrlKey && event.shiftKey) {
                        switch (event.key) {
                            case 'ArrowRight':
                                fillToEndOfLine(inputs, currentIndex, columnCount, inputFocused.value);
                                break;
                            case 'ArrowLeft':
                                fillToStartOfLine(inputs, currentIndex, columnCount, inputFocused.value);
                                break;
                            case 'ArrowUp':
                                fillToStartOfColumn(inputs, currentIndex, columnCount, inputFocused.value);
                                break;
                            case 'ArrowDown':
                                fillToEndOfColumn(inputs, currentIndex, columnCount, rowCount, inputFocused.value);
                                break;
                        }
                    }
                    if (event.altKey && event.shiftKey) {
                        fillAll(inputs, inputFocused.value);
                    }
                }, 10);
            }
        }
    });
});

function fillToEndOfLine(inputs, startIndex, columnCount, value) {
    const endOfLineIndex = startIndex - startIndex % columnCount + columnCount;
    for (let i = startIndex; i < endOfLineIndex; i++) {
        inputs[i].value = value;
    }
}

function fillToStartOfLine(inputs, startIndex, columnCount, value) {
    const startOfLineIndex = startIndex - startIndex % columnCount;
    for (let i = startOfLineIndex; i <= startIndex; i++) {
        inputs[i].value = value;
    }
}

function fillToEndOfColumn(inputs, startIndex, columnCount, rowCount, value) {
    for (let i = startIndex; i < inputs.length; i += columnCount) {
        inputs[i].value = value;
    }
}

function fillToStartOfColumn(inputs, startIndex, columnCount, value) {
    for (let i = startIndex; i >= 0; i -= columnCount) {
        inputs[i].value = value;
    }
}

function fillAll(inputs, value) {
    inputs.forEach(input => input.value = value);
}

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const productIds = urlParams.get('productIds') ? urlParams.get('productIds').split(',') : [];

    productIds.forEach(productId => {
        loadProductDetails(productId); // Asegúrate de implementar esta función
    });
});

function loadProductDetails(productId) {
    // Implementa la carga de detalles del producto
    console.log("Cargar detalles del producto:", productId);
    // Aquí podrías hacer una solicitud fetch a tu API para obtener los detalles del producto
}