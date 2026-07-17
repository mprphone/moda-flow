"""Extração de padrões/gostos a partir dos títulos dos desenvolvimentos.

Regra simples e transparente: palavras frequentes nos títulos, limpas de códigos,
nomes próprios e vocabulário de processo — sobra o vocabulário de produto
(riscas, jersey, felpa, twinset, gola, bordado...), que é o "gosto" do cliente.
"""
import re
from collections import Counter

# Vocabulário de processo, nomes e linhas de cliente — nunca são "gostos".
STOPWORDS = {
    "PEDIDO", "PEDIDOS", "URGENTE", "COMPRA", "COMPRAS", "VERSAO", "VERSÃO", "REUNIAO", "REUNIÃO",
    "PARCERIA", "EMAIL", "MAIL", "MAILS", "ENVIO", "ENVIAR", "PROPOSTA", "QUALIDADE", "QUALIDADES",
    "MODELO", "MODELOS", "DESENVOLVER", "DESENVOLVIMENTO", "DESENVOLVIMENTOS", "PRESENCIAL",
    "PENDENTE", "SELECAO", "SELEÇÃO", "ROLO", "ROLOS", "REF", "COR", "PARA", "COM", "SEM", "ASSIM",
    "BROWNIE", "WOMAN", "TEEN", "PACIFIC", "PULL", "KAPSUL", "GIRL", "HOMEM", "FLOW",
    "CLARA", "PAULA", "CRISTINA", "SILVIA", "SÍLVIA", "JULIANA", "BRUNA", "JOANA", "ISABEL", "ROSA", "NONAYA",
    "JANEIRO", "FEVEREIRO", "MARCO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO",
    "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO", "DOUBLE", "TOUCH", "SOFT",
}
CODE_RE = re.compile(r"[A-Z]{2}_B\d{3}\S*")
TOKEN_RE = re.compile(r"[A-ZÀ-ÜÇ]{4,}")


def taste_keywords(titles: list[str], limit: int = 5, minimum: int = 2) -> list[str]:
    counter: Counter[str] = Counter()
    for title in titles:
        clean = CODE_RE.sub(" ", (title or "").upper())
        for word in TOKEN_RE.findall(clean):
            if word not in STOPWORDS:
                counter[word.capitalize()] += 1
    return [word for word, count in counter.most_common(limit) if count >= minimum]
