from flask import Flask, render_template, request, jsonify
import odoo_api

app = Flask(__name__)

@app.route('/')
def index():
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


@app.route('/register_product', methods=['POST'])
def register_product_route():
    try:
        products = request.json
        uid = odoo_api.authenticate()

        if uid:
            for product in products:
                product['default_code'] = 'REF-{}'.format(product['product_name'].replace(' ', '').upper())
                print("Registering product:", product)  # Debug statement
                product_template_id = odoo_api.create_product(uid, product)

            return jsonify({'message': 'Productos registrados con éxito'})
        else:
            return jsonify({'error': 'Autenticación fallida'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)