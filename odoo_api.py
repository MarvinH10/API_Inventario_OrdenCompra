import xmlrpc.client

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

#TOMA UN PRODUCTO Y SUS ATRIBUTOS Y CREA VARIANTES DE ESTE PRODUCTO EN ODOO
def create_variant(uid, product_template_id, attribute, models):
    attribute_id = int(attribute['attribute'])
    attribute_value_ids = [int(value['id']) for value in attribute['attribute_values']]
    attribute_prices = {int(value['id']): value['price_extra'] for value in attribute['attribute_values']}

    variant_data = {
        'product_tmpl_id': product_template_id,
        'attribute_id': attribute_id,
        'value_ids': [(6, 0, attribute_value_ids)]
    }
    print("Creating variant with data:", variant_data)
    attribute_line_id = models.execute_kw(DB, uid, PASSWORD, 'product.template.attribute.line', 'create',
                                          [variant_data])
    print(f"Created attribute line with id {attribute_line_id}")

    # Actualizar el campo 'price_extra' en el modelo 'product.template.attribute.value' *ACA ES DONDE DA*
    for value_id, price_extra in attribute_prices.items():
        if price_extra:  # Actualizar solo si hay un precio extra
            # Verificar si el valor de atributo ya existe en el producto
            existing_value = models.execute_kw(DB, uid, PASSWORD, 'product.template.attribute.value', 'search', [
                [['product_attribute_value_id', '=', value_id], ['attribute_line_id', '=', attribute_line_id]]])
            if existing_value:
                # Actualizar el valor existente
                print(f"Updating existing attribute value with id {existing_value[0]} and price_extra {price_extra}")
                result = models.execute_kw(DB, uid, PASSWORD, 'product.template.attribute.value', 'write',
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
        'default_code': product.get('default_code', ''),
        'type': 'product'
    }
    print("Creating product with data:", product_template_data)
    product_template_id = models.execute_kw(DB, uid, PASSWORD, 'product.template', 'create', [product_template_data])

    for attribute in product.get('attributes', []):
        create_variant(uid, product_template_id, attribute, models)

    return product_template_id