
# Dofus Recipe Manager - Ferramenta de Otimização de Lucros

Uma aplicação web full-stack projetada para jogadores de **Dofus** que buscam maximizar seus lucros através da fabricação de itens. A ferramenta permite salvar receitas, calcular custos e lucros com base em preços de mercado (atualizados pela comunidade), gerenciar filas de produção e muito mais.

---

## 📋 Índice
- [Visão Geral](#visão-geral)
- [Funcionalidades Principais](#funcionalidades-principais)
- [Stack de Tecnologias](#stack-de-tecnologias)
- [Como Executar o Projeto](#como-executar-o-projeto)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Melhorias Futuras](#melhorias-futuras)
- [Autor](#autor)

---

## 🎯 Visão Geral
O **Dofus Recipe Manager** nasceu da necessidade de otimizar a tomada de decisão para artesãos no jogo Dofus. A economia do jogo é volátil, e saber qual item fabricar para obter o maior lucro pode ser uma tarefa complexa.

Esta aplicação centraliza informações e fornece calculadoras poderosas, permitindo que o jogador transforme dados em estratégia e Kamas. O sistema de preços é colaborativo, refletindo uma economia “em tempo quase real” mantida pelos próprios usuários.

---

## ✨ Funcionalidades Principais

### 1️⃣ Calculadora de Receitas
Busque qualquer item do jogo, insira os preços dos ingredientes e do item final para ver instantaneamente custo, receita bruta e lucro líquido.

![Calculadora de Receitas](website/images/gifs/calculator.gif)

### 2️⃣ Banco de Dados Comunitário
Os preços dos itens são armazenados e atualizados pelos próprios usuários, refletindo o mercado do servidor Hellmina.

![Banco de Dados Comunitário](website/images/gifs/database.gif)

### 3️⃣ Workbench (Bancada de Trabalho)
Adicione múltiplos itens a uma fila de produção e a ferramenta consolida todos os materiais necessários, calculando o custo total e o lucro estimado.

![Workbench](website/images/gifs/workbench.gif)

### 4️⃣ Calculadora de Runas
Compare a viabilidade de criar runas de nível 3 a partir de runas de nível 1 versus a compra de runas de nível 2.

![Calculadora de Runas](website/images/gifs/runes.gif)

### 5️⃣ Top 20 Itens Lucrativos
Descubra automaticamente as 20 receitas mais lucrativas com base nos preços de mercado salvos.

![Top 20 Itens Lucrativos](website/images/gifs/top20.gif)

### 6️⃣ Cópia Rápida (Shift + Clique)
Copie o nome de qualquer item para a área de transferência, facilitando a busca dentro do jogo.

![Cópia Rápida](website/images/gifs/copy.gif)

---

## 🚀 Stack de Tecnologias

### Backend
- **Linguagem:** Python 3
- **Framework:** Flask
- **Banco de Dados:** MySQL
- **APIs Externas:** API do DofusDB para informações de itens

### Frontend
- **Estrutura:** HTML5
- **Estilização:** CSS3
- **Interatividade:** JavaScript Vanilla (SPA)

---

## ⚙️ Como Executar o Projeto

### 1️⃣ Configurar o Backend
\`\`\`bash
# Clone o repositório
git clone https://github.com/Bobpunk/dofus_receitas_hm.git
cd dofus_receitas_hm/backend

# Crie e ative um ambiente virtual
python -m venv env
source env/bin/activate  # Windows: env\Scripts\activate

# Instale dependências
pip install -r requirements.txt

# Configure seu banco de dados MySQL e atualize as credenciais no app.py

# Inicie o servidor Flask
python app.py
\`\`\`
O backend estará rodando em: \`http://localhost:5000\`.

### 2️⃣ Executar o Frontend
- Navegue até a pasta \`website/\`.
- Abra o arquivo \`index.html\` no navegador.

---

## 📁 Estrutura do Projeto
\`\`\`
dofus_receitas_hm/
├── .gitignore
├── README.md
├── backend/           # Servidor Flask e lógica do backend
│   ├── env/           # Ambiente virtual
│   ├── app.py         # Servidor principal
│   └── ...
└── website/           # Arquivos do frontend
    ├── images/
    │   ├── gifs/      # GIFs demonstrativos
    ├── index.html
    ├── style.css
    └── script.js
\`\`\`

---

## 🔮 Melhorias Futuras
- [ ] Suporte a múltiplos servidores (Tal Kasha, Ombre, etc.)
- [ ] Sistema de autenticação de usuários
- [ ] Gráficos de histórico de preços
- [ ] Modularização do frontend para otimização de performance

---

## 👨‍💻 Autor
Desenvolvido por **Bobpunk**  
[LinkedIn](https://www.linkedin.com/in/jcfonsecajunior/)
