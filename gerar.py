"""MARCELO CLEITON · © 2026 Marcelo Cleiton. Gera o site estático para GitHub Pages."""
from pathlib import Path
import shutil
import hashlib
BASE = Path(__file__).resolve().parent
SRC = BASE / 'src'
SAIDA = BASE / 'docs'
ASSETS = SAIDA / 'assets'
ASSETS.mkdir(parents=True, exist_ok=True)
for p in SRC.rglob('*'):
    if p.is_file():
        destino = ASSETS / p.relative_to(SRC)
        destino.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(p, destino)
ordem = ['react.min.js', 'react-dom.min.js', 'htm.min.js', 'decimal.min.js', 'dados.js', 'ncm-dados.js']
ordem += [p.relative_to(SRC).as_posix() for p in sorted((SRC / 'ncm').glob('*.js'))]
ordem += ['gestor-ui.js', 'motor.js', 'grade-dados.js', 'grade.js', 'pedido.js', 'aplicacao.js']
credito = 'MARCELO CLEITON, criador do projeto. Análise do impacto da Reforma Tributária nas aplicações da SN SISTEMA. © 2026 Marcelo Cleiton'
def versao(nome):
    return hashlib.sha256((SRC / nome).read_bytes()).hexdigest()[:12]
css = ''.join('<link rel="stylesheet" href="assets/' + nome + '?v=' + versao(nome) + '">' for nome in ['fontes.css', 'estilo.css', 'grade.css', 'gestor.css', 'tema-escuro.css', 'menu-lateral.css'])
scripts = ''.join('<script defer src="assets/' + nome + '?v=' + versao(nome) + '"></script>' for nome in ordem)
html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,interactive-widget=resizes-content"><meta name="author" content="MARCELO CLEITON"><meta name="description" content="' + credito + '"><title>Simulador da Reforma Tributária · Gestor · Marcelo Cleiton</title>' + css + '<script>window.MODO_INICIAL="gestor";window.ABA_INICIAL="preco";</script>' + scripts + '</head><body><div id="root"><p>' + credito + '</p><p>Carregando simulador…</p></div><noscript>Ative JavaScript para usar os cálculos locais.</noscript></body></html>'
(SAIDA / 'index.html').write_text(html)
(SAIDA / '.nojekyll').write_text('')
print('Site gerado em', SAIDA / 'index.html')
