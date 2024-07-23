from flask import Flask, render_template, request, jsonify
from odoo_api import update_internal_reference_by_attribute
import odoo_api

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/productos')
def productos():
    # Asegúrate de que 'productos.html' está en la carpeta de templates
    return render_template('productos.html')

@app.route('/get_categories', methods=['GET'])
def get_categories_route():
    try:
        uid = odoo_api.authenticate()
        if uid:
            categories = odoo_api.get_categories(uid)
            return jsonify(categories)
        else:
            return jsonify({'error': 'Autenticación fallida'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_subcategories/<int:parent_id>', methods=['GET'])
def get_subcategories_route(parent_id):
    try:
        uid = odoo_api.authenticate()
        if uid:
            subcategories = odoo_api.get_subcategories(uid, parent_id)
            return jsonify(subcategories)
        else:
            return jsonify({'error': 'Autenticación fallida'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_attributes', methods=['GET'])
def get_attributes_route():
    try:
        uid = odoo_api.authenticate()
        if uid:
            attributes = odoo_api.get_attributes(uid)
            return jsonify(attributes)
        else:
            return jsonify({'error': 'Autenticación fallida'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_all_categories_and_subcategories', methods=['GET'])
def get_all_categories_and_subcategories_route():
    try:
        uid = odoo_api.authenticate()
        if uid:
            categories = odoo_api.get_categories(uid)
            all_categories_and_subcategories = []

            for category in categories:
                subcategories = odoo_api.get_subcategories(uid, category['id'])
                all_categories_and_subcategories.append({
                    'category': {
                        'id': category['id'],
                        'name': category['name']
                    },
                    'subcategories': subcategories
                })

            return jsonify(all_categories_and_subcategories)
        else:
            return jsonify({'error': 'Autenticación fallida'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/update-reference', methods=['POST'])
def update_reference():
    data = request.json
    result = update_internal_reference_by_attribute(data['productId'], data['attributeName'], data['newReference'])
    return jsonify({'success': result})

@app.route('/register_product', methods=['POST'])
def register_product_route():
    try:
        products = request.json
        uid = odoo_api.authenticate()
        product_ids = []
        if uid:
            for product in products:
                product_id = odoo_api.create_product(uid, product)
                product_ids.append(product_id)
            return jsonify({'message': 'Productos registrados con éxito', 'product_ids': product_ids})
        else:
            return jsonify({'error': 'Autenticación fallida'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

### referencte a ordenes de compra pa abajo

@app.route('/ordenes')
def ordenes():
    product_ids = request.args.get('productIds')
    if product_ids:
        product_ids = [int(pid) for pid in product_ids.split(',')]
        # Aquí podrías cargar los datos de los productos usando estos IDs
        products = [odoo_api.get_product_details(pid) for pid in product_ids]
    else:
        products = []

    return render_template('ordenes.html', products=products)

@app.route('/get_main_products', methods=['GET'])
def get_main_products_route():
    try:
        uid = odoo_api.authenticate()
        if uid:
            main_products = odoo_api.get_main_products(uid)
            return jsonify(main_products)
        else:
            return jsonify({'error': 'Autenticación fallida'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_suppliers', methods=['GET'])
def get_suppliers_route():
    try:
        uid = odoo_api.authenticate()
        if uid:
            suppliers = odoo_api.get_suppliers(uid)
            return jsonify(suppliers)
        else:
            return jsonify({'error': 'Autenticación fallida'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/get_product_variants/<int:product_id>', methods=['GET'])
def get_product_variants_route(product_id):
    try:
        uid = odoo_api.authenticate()
        if uid:
            product_variants = odoo_api.get_product_variants(uid, product_id)
            return jsonify(product_variants)
        else:
            return jsonify({'error': 'Autenticación fallida'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_all_product_variants', methods=['GET'])
def get_all_product_variants_route():
    try:
        uid = odoo_api.authenticate()
        if uid:
            all_variants = []
            products = odoo_api.get_main_products(uid)
            for product in products:
                variants = odoo_api.get_product_variants(uid, product['id'])
                all_variants.append({'product_id': product['id'], 'variants': variants})
            return jsonify(all_variants)
        else:
            return jsonify({'error': 'Autenticación fallida'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@app.route('/register_order', methods=['POST'])
def register_order_route():
    try:
        orders = request.json
        uid = odoo_api.authenticate()
        if uid:
            # Agrupar productos por proveedor
            supplier_orders = {}
            for order in orders:
                supplier_id = order['supplier_id']
                if supplier_id not in supplier_orders:
                    supplier_orders[supplier_id] = {
                        'supplier_id': supplier_id,
                        'supplier_reference': order.get('supplier_reference', ''),
                        'variants': []
                    }
                supplier_orders[supplier_id]['variants'].extend(order['variants'])

            order_ids = []
            for supplier_id, order in supplier_orders.items():
                order_id = odoo_api.create_order(uid, order)
                order_ids.append(order_id)

            return jsonify({'message': 'Órdenes registradas con éxito', 'order_ids': order_ids})
        else:
            return jsonify({'error': 'Autenticación fallida'}), 401
    except Exception as e:
        print(f"Error registrando orden: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)