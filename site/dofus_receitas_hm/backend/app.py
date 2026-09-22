import os
import json
import unicodedata
import re
import requests
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# --- Constantes ---
backend_folder = os.path.dirname(os.path.abspath(__file__))
STATIC_FOLDER = os.path.join(backend_folder, '..', 'website')
IMAGES_FOLDER = os.path.join(STATIC_FOLDER, 'images')
RECIPES_FILE = 'receitas.json'
FALLBACK_IMAGE = 'desconhecido.png'
ITEM_DATABASE_FILE = 'item_database.json'

app = Flask(__name__, static_folder=STATIC_FOLDER)
CORS(app)

# --- Variáveis Globais para os bancos de dados ---
LOCAL_ITEM_DB = {}
ID_TO_ITEM_MAP = {}

# --- Funções de utilidade ---
def criar_chave_limpa(nome):
    s = ''.join(c for c in unicodedata.normalize('NFD', nome.lower()) if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]', '', s)

def read_recipes():
    filepath = os.path.join(backend_folder, RECIPES_FILE)
    if not os.path.exists(filepath) or os.path.getsize(filepath) == 0:
        return {}
    with open(filepath, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}

def write_recipes(recipes):
    filepath = os.path.join(backend_folder, RECIPES_FILE)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(recipes, f, indent=4, ensure_ascii=False)

def build_local_item_database():
    global LOCAL_ITEM_DB, ID_TO_ITEM_MAP
    db_path = os.path.join(backend_folder, ITEM_DATABASE_FILE)
    if os.path.exists(db_path):
        print("Carregando banco de dados de itens local...")
        with open(db_path, 'r', encoding='utf-8') as f:
            LOCAL_ITEM_DB = json.load(f)
        ID_TO_ITEM_MAP = {v['ankama_id']: v for k, v in LOCAL_ITEM_DB.items() if 'ankama_id' in v}
        print("Banco de dados de itens carregado.")
        return

    print("Construindo banco de dados de itens local pela primeira vez. Isso pode demorar bastante...")
    LOCAL_ITEM_DB = {}
    
   
    categories = ['resources', 'consumables', 'equipment', 'weapons', 'pets', 'mounts', 'idols']
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    for category in categories:
        try:
            url = f"https://api.dofusdu.de/dofus2/pt/items/{category}/all"
            print(f"Baixando categoria: {category}...")
            response = requests.get(url, headers=headers, timeout=60)
            response.raise_for_status()
            items = response.json().get('items', [])
            for item in items:
                clean_key = criar_chave_limpa(item['name'])
                LOCAL_ITEM_DB[clean_key] = item
            print(f"Categoria {category} adicionada ({len(items)} itens).")
        except Exception as e:
            print(f"Falha ao baixar a categoria {category}: {e}")

    with open(db_path, 'w', encoding='utf-8') as f:
        json.dump(LOCAL_ITEM_DB, f, ensure_ascii=False)
    
    ID_TO_ITEM_MAP = {v['ankama_id']: v for k, v in LOCAL_ITEM_DB.items() if 'ankama_id' in v}
    print("Banco de dados de itens local construído e salvo com sucesso!")

def get_and_download_image(item_name, image_filename):
    item_key = criar_chave_limpa(item_name)
    item_data = LOCAL_ITEM_DB.get(item_key)
    if not item_data:
        print(f"Item '{item_name}' (chave: {item_key}) não encontrado localmente.")
        return False
        
    image_urls = item_data.get('image_urls', {})
    image_url = image_urls.get('sd') or image_urls.get('icon') # Tenta pegar 'sd', se não tiver, pega 'icon'

    if not image_url:
        print(f"Item '{item_name}' encontrado, mas sem URL de imagem.")
        return False
        
    try:
        filepath = os.path.join(IMAGES_FOLDER, image_filename)
        if not os.path.exists(filepath):
            headers = {'User-Agent': 'Mozilla/5.0'}
            response = requests.get(image_url, headers=headers, stream=True, timeout=10)
            response.raise_for_status()
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
            
        return True
    except Exception as e:
        print(f"Erro ao baixar a imagem de {image_url}: {e}")
        return False

# Rotas da API 

@app.route('/api/item_database', methods=['GET'])
def get_item_database():
    db_path = os.path.join(backend_folder, ITEM_DATABASE_FILE)
    if os.path.exists(db_path):
        return send_from_directory(backend_folder, ITEM_DATABASE_FILE)
    return jsonify({})

@app.route('/api/recipes', methods=['GET'])
def get_all_recipes():
    return jsonify(read_recipes())

@app.route('/api/recipes', methods=['POST'])
def save_recipe():
    data = request.json
    if not data or 'name' not in data or 'ingredients' not in data:
        return jsonify({"error": "Dados inválidos"}), 400
    recipes = read_recipes()
    recipe_key = criar_chave_limpa(data['name'])
    category = "Sem Categoria"
    item_info_from_db = LOCAL_ITEM_DB.get(recipe_key)
    if item_info_from_db and item_info_from_db.get('type') and item_info_from_db['type'].get('name'):
        category = item_info_from_db['type']['name']
    print(f"Item '{data['name']}' categorizado automaticamente como '{category}'.")
    if category not in recipes:
        recipes[category] = {}
    recipe_data = { "name": data['name'], "yield": data.get('yield', 1), "ingredients": data['ingredients'] }
    if get_and_download_image(recipe_data['name'], f"{recipe_key}.png"):
        recipe_data['image'] = f"{recipe_key}.png"
    else:
        recipe_data['image'] = FALLBACK_IMAGE
    for ingredient in recipe_data['ingredients']:
        ing_key = criar_chave_limpa(ingredient['name'])
        if get_and_download_image(ingredient['name'], f"{ing_key}.png"):
            ingredient['image'] = f"{ing_key}.png"
        else:
            ingredient['image'] = FALLBACK_IMAGE
    recipes[category][recipe_key] = recipe_data
    write_recipes(recipes)
    return jsonify({"success": True, "data": recipe_data}), 201

@app.route('/api/recipes/<category>/<recipe_key>', methods=['DELETE'])
def delete_recipe_by_key(category, recipe_key):
    recipes = read_recipes()
    if category in recipes and recipe_key in recipes[category]:
        del recipes[category][recipe_key]
        if not recipes[category]:
            del recipes[category]
        write_recipes(recipes)
        return jsonify({"success": True})
    return jsonify({"error": "Receita não encontrada"}), 404

#  Rotas para servir o Frontend 
@app.route('/')
def serve_index(): return send_from_directory(app.static_folder, 'index.html')
@app.route('/<path:path>')
def serve_static_files(path): return send_from_directory(app.static_folder, path)


#  PONTO DE ENTRADA DO SERVIDOR 
if __name__ == '__main__':
    os.makedirs(IMAGES_FOLDER, exist_ok=True)
    build_local_item_database()
    print("Iniciando o servidor Flask...")
    print("Acesse http://localhost:5000 no seu navegador")
    app.run(port=5000, debug=True)