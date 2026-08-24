# Plano de Segurança do Abordador

Aplicação web estática de apoio ao abordador, vinculada ao **GTO ATS — Grupo Temático Operacional de Atendimento a Tentativas de Suicídio**.

## Identidade do projeto

- **Nome público:** Plano de Segurança do Abordador
- **Slug canônico do repositório/site:** `plano-seguranca-abordador`
- **Responsabilidade:** Coordenação do GTO ATS · CBMMG
- **Coordenação:** Maj BM Richelmy Murta
- **Público:** abordadores que desejam construir e revisar o próprio plano pessoal de segurança e autocuidado

O material não substitui protocolos operacionais, avaliação em saúde ou atendimento de urgência.

## Arquitetura

Projeto deliberadamente simples e estático, sem framework e sem backend. A decisão reduz superfície de ataque, dependências, custo de manutenção e risco de exposição de dados pessoais.

```text
/
├── index.html   # estrutura semântica, conteúdo e metadados sociais
├── styles.css   # apresentação responsiva e impressão
├── app.js       # persistência local, compartilhamento e PDF
└── README.md    # documentação técnica
```

### Fluxo de dados

1. O usuário preenche o formulário no navegador.
2. `app.js` serializa os campos em `localStorage` usando a chave `gto-ats-plano-seguranca-abordador-v1`.
3. Nenhuma resposta é enviada a servidor, API, analytics, GTO ATS ou CBMMG.
4. O PDF é montado no próprio navegador com jsPDF.
5. O usuário pode apagar integralmente os dados locais pelo botão **Apagar meus dados**.

A chave de armazenamento foi preservada para manter compatibilidade com preenchimentos feitos na versão anterior.

## Preview social / WhatsApp

O `<head>` contém metadados Open Graph e Twitter Card para que WhatsApp, Facebook, LinkedIn e outros clientes possam montar a prévia do link.

- **Título social:** `Plano de Segurança do Abordador | GTO ATS`
- **Descrição social:** material de apoio ao abordador do GTO ATS
- **Imagem social atual:** `https://i.pinimg.com/736x/55/bc/eb/55bceb38f978b7d0c9d4eaf64054ccfb.jpg`
- **Origem da imagem:** referência já utilizada no repositório `Curso-ATS`, no conteúdo “Encontro 2: Abordagem Técnica”
- **Formato:** JPEG via HTTPS

A imagem social é uma dependência externa. Para máxima previsibilidade de cache e disponibilidade, a arquitetura preferencial futura é hospedar uma imagem própria do projeto em `assets/og-plano-seguranca-abordador.jpg` e apontar `og:image` para o mesmo domínio do GitHub Pages.

O WhatsApp pode manter metadados antigos em cache após uma atualização. A alteração no código não garante atualização instantânea de conversas ou previews já processados.

## PDF

A geração do PDF usa texto vetorial, não captura de tela. Isso permite:

- A4 real;
- quebra automática de páginas;
- textos longos sem corte arbitrário;
- paginação;
- identificação opcional;
- data de geração e data de revisão;
- checklist pós-ocorrência;
- rodapé técnico uniforme;
- arquivo final `Plano-de-Seguranca-do-Abordador-GTO-ATS.pdf`.

Se jsPDF não estiver disponível no navegador, a página mantém **Imprimir** como fallback.

## Privacidade e segurança

- sem banco de dados;
- sem autenticação;
- sem cookies próprios;
- sem telemetria ou analytics;
- sem envio de formulário;
- persistência somente em `localStorage`;
- vídeos incorporados pelo domínio `youtube-nocookie.com`;
- Content Security Policy declarada no HTML;
- dependências externas limitadas a Font Awesome, jsPDF, YouTube no-cookie e a imagem social do Pinterest;
- sem Service Worker, evitando cache persistente de versões antigas.

Em dispositivo compartilhado, a orientação é gerar o PDF e apagar os dados locais ao final.

## Dependências externas

| Dependência | Finalidade |
|---|---|
| Font Awesome 6.5.2 | ícones da interface |
| jsPDF 2.5.1 | geração local do PDF |
| YouTube no-cookie | vídeos de apoio e técnicas guiadas |
| `i.pinimg.com` | imagem de preview social/Open Graph |

Não há processo de build. O repositório pode ser publicado diretamente pelo GitHub Pages.

## Publicação

Configuração recomendada do GitHub Pages:

- branch: `main`;
- diretório: `/ (root)`;
- HTTPS obrigatório;
- nome do repositório: `plano-seguranca-abordador`.

O caminho público do GitHub Pages é derivado do nome do repositório. Por isso, a alteração do slug do repositório deve ser tratada como alteração de URL pública e validada após a renomeação.

## Manutenção

Antes de publicar uma mudança:

1. testar preenchimento e salvamento em desktop e celular;
2. recarregar a página e confirmar restauração do `localStorage`;
3. testar **Apagar meus dados**;
4. testar compartilhamento;
5. gerar PDF com campos vazios, curtos e extensos;
6. conferir paginação e rodapé do PDF;
7. abrir todos os vídeos incorporados;
8. validar responsividade em largura aproximada de 360 px;
9. confirmar que não há referência a atividade clínica particular, CRP, telefone pessoal ou atendimento psicológico individual;
10. validar o preview social em um novo envio;
11. validar o endereço público após qualquer mudança de nome do repositório.

## Convenções

- Termo institucional: **GTO ATS — Grupo Temático Operacional de Atendimento a Tentativas de Suicídio**.
- Título do produto: **Plano de Segurança do Abordador**.
- Slug: **`plano-seguranca-abordador`**.
- Alterações estruturais devem preservar privacidade local e compatibilidade de dados sempre que possível.

## Versão de arquitetura

`2.1` — Open Graph/Twitter Card; imagem social; CSP ajustada para o preview; separação entre estrutura, estilos e comportamento; PDF vetorial; persistência compatível; documentação técnica.
