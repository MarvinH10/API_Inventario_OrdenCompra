import xmlrpc.client
from datetime import datetime

from flask import jsonify

ODOO_URL = 'https://kdoshstoreproof.odoo.com'
DB = 'kdoshstoreproof'
USERNAME = 'j99crispin@gmail.com'
PASSWORD = '952fe0212b885854888fb8f720ce64d448512e30'

#CONEXIÓN CON EL SERVIDOR XML-RPC
def authenticate():
    common = xmlrpc.client.ServerProxy('{}/xmlrpc/2/common'.format(ODOO_URL))
    uid = common.authenticate(DB, USERNAME, PASSWORD, {})
    return uid

#OBTENER LAS CATEGORÍAS DE LOS PRODUCTOS
def get_categories(uid):
    models = xmlrpc.client.ServerProxy('{}/xmlrpc/2/object'.format(ODOO_URL))
    categories = models.execute_kw(DB, uid, PASSWORD, 'product.category', 'search_read', [[['parent_id', '=', False]], ['name', 'id']])
    return categories

#OBTENER LAS SUBCATEGORÍAS DE LOS PRODUCTOS
def get_subcategories(uid, parent_id):
    models = xmlrpc.client.ServerProxy('{}/xmlrpc/2/object'.format(ODOO_URL))
    subcategories = models.execute_kw(DB, uid, PASSWORD, 'product.category', 'search_read', [[['parent_id', '=', parent_id]], ['name', 'id']])
    return subcategories

#OBTENER LOS ATRIBUTOS DE LOS PRODUCTOS
def get_attributes(uid):
    models = xmlrpc.client.ServerProxy('{}/xmlrpc/2/object'.format(ODOO_URL))
    attributes = models.execute_kw(DB, uid, PASSWORD, 'product.attribute', 'search_read', [[], ['name', 'value_ids', 'id']])
    attribute_values = {}
    for attribute in attributes:
        values = models.execute_kw(DB, uid, PASSWORD, 'product.attribute.value', 'read', [attribute['value_ids']], {'fields': ['name', 'id']})
        attribute_values[attribute['id']] = {'name': attribute['name'], 'values': values}
    return attribute_values

#CONEXIÓN, PROCESAMIENTO DE CATEGORÍAS, CREACIÓN DE LOS DATOS, REGISTRO, MANEJO DE ATRIBUTOS DEL PRODUCTO
def create_product(uid, product):
    models = xmlrpc.client.ServerProxy('{}/xmlrpc/2/object'.format(ODOO_URL))
    categ_id = int(product['category']) if product['category'] else None
    subcategories = [int(sub) if sub else None for sub in product['subcategories']]
    subcategories = [subcat for subcat in subcategories if subcat is not None]

    if subcategories:
        categ_id = subcategories[-1]

    product_template_data = {
        'name': product['product_name'],
        'categ_id': categ_id,
        'list_price': product['sale_price'],
        'default_code': product['product_code'].replace(' ', '').upper(),
        'type': 'product',
        'available_in_pos': True
    }
    print("Creating product with data:", product_template_data)
    product_template_id = models.execute_kw(DB, uid, PASSWORD, 'product.template', 'create', [product_template_data])

    for attribute in product.get('attributes', []):
        create_variant(uid, product_template_id, attribute)

    return product_template_id

#TOMA UN PRODUCTO Y SUS ATRIBUTOS Y CREA VARIANTES DE ESTE PRODUCTO EN ODOO
def create_variant(uid, product_template_id, attribute):
    models = xmlrpc.client.ServerProxy('{}/xmlrpc/2/object'.format(ODOO_URL))
    attribute_id = int(attribute['attribute'])
    attribute_value_ids = [int(value['id']) for value in attribute['attribute_values']]
    attribute_prices = {int(value['id']): value['price_extra'] for value in attribute['attribute_values']}
    attribute_references = {int(value['id']): value['reference_extra'] for value in attribute['attribute_values']}

    variant_data = {
        'product_tmpl_id': product_template_id,
        'attribute_id': attribute_id,
        'value_ids': [(6, 0, attribute_value_ids)]
    }
    print("Creating variant with data:", variant_data)
    attribute_line_id = models.execute_kw(DB, uid, PASSWORD, 'product.template.attribute.line', 'create',
                                          [variant_data])
    # Actualizar el campo 'price_extra' en el modelo 'product.template.attribute.value' *ACA ES DONDE DA*
    for value_id, price_extra in attribute_prices.items():
        if price_extra:  # Actualizar solo si hay un precio extra
            existing_value = models.execute_kw(DB, uid, PASSWORD, 'product.template.attribute.value', 'search', [
                [['product_attribute_value_id', '=', value_id], ['attribute_line_id', '=', attribute_line_id]]])
            if existing_value:
                # Actualizar el valor existente
                print(f"Updating existing attribute value with id {existing_value[0]} and price_extra {price_extra}")
                models.execute_kw(DB, uid, PASSWORD, 'product.template.attribute.value', 'write',
                                  [[existing_value[0]], {'price_extra': price_extra}])
            else:
                # Crear nuevo valor de atributo
                value_data = {
                    'product_tmpl_id': product_template_id,
                    'product_attribute_value_id': value_id,
                    'price_extra': price_extra,
                    'attribute_line_id': attribute_line_id
                }
                result = models.execute_kw(DB, uid, PASSWORD, 'product.template.attribute.value', 'create',
                                           [value_data])
                print(f"Created attribute value with id {result} and price_extra {price_extra}")

    # Asignar default_code a cada variante basado en su combinación de atributos
    for value_id in attribute_value_ids:
        reference_extra = attribute_references[value_id]
        variant_ids = models.execute_kw(DB, uid, PASSWORD, 'product.product', 'search', [
            [['product_tmpl_id', '=', product_template_id],
             ['product_template_attribute_value_ids.product_attribute_value_id', '=', value_id]]])
        for variant_id in variant_ids:
            print(f"Updating variant {variant_id} with reference_extra {reference_extra}")
            models.execute_kw(DB, uid, PASSWORD, 'product.product', 'write',
                              [[variant_id], {'default_code': reference_extra}])

#USADO SOLO PARA SUBIR CON EL IMPUESTO DE 0%
def create_and_adjust_taxes(uid, product):
    models = xmlrpc.client.ServerProxy('{}/xmlrpc/2/object'.format(ODOO_URL))
    product_template_id = create_product(uid, product)  # Crear el producto primero sin especificar 'taxes_id'

    models.execute_kw(DB, uid, PASSWORD, 'product.template', 'write', [[product_template_id], {'taxes_id': [(5,)]}])

    return product_template_id

def update_internal_reference_by_attribute(product_id, attribute_name, new_reference, uid):
    proxy = xmlrpc.client.ServerProxy('{}/xmlrpc/2/object'.format(ODOO_URL))
    try:
        product = proxy.execute_kw(DB, uid, PASSWORD, 'product.product', 'search_read',
                                   [[['id', '=', product_id]]], {'fields': ['attribute_line_ids']})
        if not product:
            print("Producto no encontrado")
            return False

        for line in product[0]['attribute_line_ids']:
            attribute_line = proxy.execute_kw(DB, uid, PASSWORD, 'product.attribute.line', 'read',
                                              [line], {'fields': ['attribute_id', 'value_ids']})
            attribute = proxy.execute_kw(DB, uid, PASSWORD, 'product.attribute', 'read',
                                         [attribute_line[0]['attribute_id'][0]], {'fields': ['name']})
            if attribute[0]['name'] == attribute_name:
                proxy.execute_kw(DB, uid, PASSWORD, 'product.product', 'write',
                                 [[product_id], {'default_code': new_reference}])
                print("Referencia interna actualizada correctamente")
                return True

        print("Atributo no encontrado en el producto")
        return False

    except Exception as e:
        print(f"Error: {e}")
        return False

### todo refrenente a ordenes de compra pa abajo
def get_main_products(uid):
    models = xmlrpc.client.ServerProxy('{}/xmlrpc/2/object'.format(ODOO_URL))
    products = models.execute_kw(DB, uid, PASSWORD, 'product.template', 'search_read', [[], ['name', 'id']])
    return products

def get_suppliers(uid):
    models = xmlrpc.client.ServerProxy('{}/xmlrpc/2/object'.format(ODOO_URL))
    suppliers = models.execute_kw(DB, uid, PASSWORD, 'res.partner', 'search_read', [[['supplier_rank', '>', 0]], ['name', 'id']])
    return suppliers

def get_product_variants(uid, product_id):
    models = xmlrpc.client.ServerProxy('{}/xmlrpc/2/object'.format(ODOO_URL))
    variants = models.execute_kw(DB, uid, PASSWORD, 'product.product', 'search_read', [[['product_tmpl_id', '=', product_id]], ['name', 'id', 'product_template_variant_value_ids']])
    for variant in variants:
        attribute_values = models.execute_kw(DB, uid, PASSWORD, 'product.template.attribute.value', 'read', [variant['product_template_variant_value_ids']], {'fields': ['name']})
        variant['attributes'] = [attr['name'] for attr in attribute_values]
    return variants


def create_order(uid, order):
    models = xmlrpc.client.ServerProxy('{}/xmlrpc/2/object'.format(ODOO_URL))
    order_lines = []

    for variant in order['variants']:
        # First check if the product variant exists in product.product
        product_exists = models.execute_kw(DB, uid, PASSWORD, 'product.product', 'search',
                                           [[['id', '=', variant['variant_id']]]])

        if product_exists:
            product_id = variant['variant_id']  # This is the ID for a variant
        else:
            # If no variant exists, check in product.template
            product_exists = models.execute_kw(DB, uid, PASSWORD, 'product.template', 'search',
                                               [[['id', '=', variant['variant_id']]]])
            if product_exists:
                product_id = models.execute_kw(DB, uid, PASSWORD, 'product.product', 'search',
                                               [[['product_tmpl_id', '=', variant['variant_id']]]])[0]
            else:
                print(f"Product or variant with ID {variant['variant_id']} does not exist.")
                continue  # Skip this non-existent product

        # Proceed to create order line
        line_data = {
            'product_id': product_id,
            'product_qty': variant['quantity'],
            'price_unit': variant.get('price_unit', 0),
            'taxes_id': [(6, 0, [])]  # No taxes
        }
        order_lines.append((0, 0, line_data))

    if not order_lines:
        print("No valid products found for this order.")
        return None  # Or handle this scenario appropriately

    current_date = datetime.now().strftime('%Y-%m-%d')
    order_data = {
        'partner_id': order['supplier_id'],
        'date_order': current_date,
        'partner_ref': order.get('supplier_reference', ''),
        'date_planned': order.get('date_planned', current_date),
        'picking_type_id': int(order.get('picking_type_id', 1)),
        'order_line': order_lines
    }

    try:
        print("Creating order with data: ", order_data)
        order_id = models.execute_kw(DB, uid, PASSWORD, 'purchase.order', 'create', [order_data])
        print(f"Order created successfully with ID: {order_id}")
        return order_id
    except xmlrpc.client.Fault as e:
        print(f"XML-RPC Fault: {e}")
        return None