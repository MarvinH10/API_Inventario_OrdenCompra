function fetchProveedorData() {
    const ruc = document.getElementById('proveedor_ruc').value;
    if (ruc) {
        fetch(`/fetch_sunat_data/${ruc}`)
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => { throw new Error(text || 'Network response was not ok'); });
                }
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    alert('Error: ' + data.error);
                } else {
                    document.getElementById('proveedor_name').value = data.razonSocial || '';
                    document.getElementById('proveedor_address').value = data.direccion || '';
                    document.getElementById('proveedor_district').value = data.distrito || '';
                    document.getElementById('proveedor_province').value = data.provincia || '';
                    document.getElementById('proveedor_department').value = data.departamento || '';
                    document.getElementById('proveedor_ubigeo').value = data.ubigeo || '';
                    document.getElementById('proveedor_phone').value = data.telefono || '';
                    document.getElementById('proveedor_website').value = data.paginaWeb || '';
                    document.getElementById('proveedor_activities').value = data.actividad || '';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error: ' + error.message);
            });
    } else {
        alert('Por favor, ingrese un RUC válido.');
    }
}

function saveProveedor() {
    const ruc = document.getElementById('proveedor_ruc').value;
    const name = document.getElementById('proveedor_name').value;
    const address = document.getElementById('proveedor_address').value;
    const district = document.getElementById('proveedor_district').value;
    const province = document.getElementById('proveedor_province').value;
    const department = document.getElementById('proveedor_department').value;
    const ubigeo = document.getElementById('proveedor_ubigeo').value;
    const phone = document.getElementById('proveedor_phone').value;
    const website = document.getElementById('proveedor_website').value;
    const activities = document.getElementById('proveedor_activities').value;

    if (!ruc || !name || !address || !district || !province || !department || !ubigeo || !phone) {
        alert('Por favor, complete todos los campos requeridos.');
        return;
    }

    const proveedor = {
        ruc: ruc,
        name: name,
        address: address,
        district: district,
        province: province,
        department: department,
        ubigeo: ubigeo,
        phone: phone,
        website: website,
        activities: activities,
        activity_ids: activities.split(',')  // Asumiendo que activities es una lista separada por comas
    };

    console.log('Enviando proveedor:', proveedor);

    fetch('/register_proveedor', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(proveedor)
    })
    .then(response => {
        return response.json().then(data => {
            if (!response.ok) {
                throw new Error(data.error || 'Network response was not ok');
            }
            return data;
        });
    })
    .then(data => {
        if (data.error) {
            console.error('Error en el servidor:', data.error);
            alert('Error: ' + data.error + '\nDetalles: ' + (data.details || ''));
        } else {
            const proveedorId = data.proveedor_id;
            const proveedorUrl = `https://kdoshstoreproof.odoo.com/odoo/vendors/${proveedorId}?debug=1&cids=1`;
            alert(`Proveedor registrado con éxito. Puede revisar el proveedor en el siguiente enlace: ${proveedorUrl}`);
            window.open(proveedorUrl, '_blank');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error: ' + error.message);
    });
}

document.addEventListener('DOMContentLoaded', function () {
    loadProveedores();
});

function loadProveedores() {
    fetch('/get_proveedores')
        .then(response => response.json())
        .then(data => {
            if (!Array.isArray(data)) {
                console.error('Respuesta inesperada del servidor:', data);
                alert('Hubo un error al cargar los proveedores. Por favor, revisa la consola para más detalles.');
                return; // Salir de la función si los datos no son un array
            }
            const proveedorList = document.getElementById('proveedorList');
            proveedorList.innerHTML = '';
            data.forEach(proveedor => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${proveedor.name}</td>
                    <td>${proveedor.ruc}</td>
                    <td>${proveedor.address}</td>
                    <td>${proveedor.district}</td>
                    <td>${proveedor.province}</td>
                    <td>${proveedor.department}</td>
                    <td>${proveedor.ubigeo}</td>
                    <td>${proveedor.phone}</td>
                    <td>${proveedor.website}</td>
                    <td>${proveedor.activities}</td>
                `;
                proveedorList.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Hubo un error al procesar la solicitud.');
        });
}


