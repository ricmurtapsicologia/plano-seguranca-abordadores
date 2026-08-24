(() => {
  'use strict';

  const STORAGE_KEY = 'gto-ats-plano-seguranca-abordador-v1';
  const fields = [...document.querySelectorAll('[data-save]')];
  const planFields = [...document.querySelectorAll('[data-plan]')];
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const saveStatus = document.getElementById('saveStatus');
  const toast = document.getElementById('toast');
  const overlay = document.getElementById('overlay');

  let toastTimer;
  let saveTimer;

  const storage = {
    read() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
      catch { return {}; }
    },
    write(data) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return true; }
      catch { return false; }
    },
    clear() {
      try { localStorage.removeItem(STORAGE_KEY); return true; }
      catch { return false; }
    }
  };

  function notify(message) {
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
  }

  function collectData() {
    const data = { version: 2, savedAt: new Date().toISOString() };
    fields.forEach((field) => {
      data[field.id] = field.type === 'checkbox' ? field.checked : field.value;
    });
    return data;
  }

  function updateProgress() {
    const completed = planFields.filter((field) => field.value.trim().length >= 8).length;
    const percent = Math.round((completed / planFields.length) * 100);
    progressBar.style.width = `${percent}%`;
    progressText.textContent = `${percent}%`;
  }

  function formatSavedAt(date = new Date()) {
    return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function save({ silent = true } = {}) {
    const ok = storage.write(collectData());
    saveStatus.textContent = ok
      ? `Salvo neste dispositivo em ${formatSavedAt()}.`
      : 'Não foi possível salvar neste navegador. Gere o PDF para manter uma cópia.';
    if (!silent) notify(ok ? 'Plano salvo neste dispositivo.' : 'Falha ao salvar localmente.');
    updateProgress();
  }

  function load() {
    const data = storage.read();
    fields.forEach((field) => {
      if (!(field.id in data)) return;
      if (field.type === 'checkbox') field.checked = Boolean(data[field.id]);
      else field.value = data[field.id] || '';
    });
    if (data.savedAt) {
      const savedAt = new Date(data.savedAt);
      if (!Number.isNaN(savedAt.getTime())) saveStatus.textContent = `Último salvamento neste dispositivo: ${formatSavedAt(savedAt)}.`;
    }
    updateProgress();
  }

  function scheduleSave() {
    updateProgress();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => save({ silent: true }), 500);
  }

  fields.forEach((field) => {
    field.addEventListener('input', scheduleSave);
    field.addEventListener('change', scheduleSave);
  });

  document.getElementById('saveButton').addEventListener('click', () => save({ silent: false }));
  document.getElementById('printButton').addEventListener('click', () => window.print());

  document.getElementById('clearButton').addEventListener('click', () => {
    const confirmed = window.confirm('Apagar todas as respostas salvas neste dispositivo? Esta ação não pode ser desfeita.');
    if (!confirmed) return;
    storage.clear();
    fields.forEach((field) => {
      if (field.type === 'checkbox') field.checked = false;
      else field.value = '';
    });
    saveStatus.textContent = 'Dados locais apagados.';
    updateProgress();
    notify('Dados apagados deste dispositivo.');
  });

  document.getElementById('shareButton').addEventListener('click', async () => {
    const shareData = {
      title: 'Plano de Segurança do Abordador | GTO ATS',
      text: 'Plano de Segurança do Abordador — material de apoio do GTO ATS.',
      url: window.location.href
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        notify('Link copiado.');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') notify('Não foi possível compartilhar automaticamente.');
    }
  });

  function ensurePage(doc, y, needed = 28) {
    const height = doc.internal.pageSize.getHeight();
    if (y + needed <= height - 18) return y;
    doc.addPage();
    return 20;
  }

  function writeWrapped(doc, text, x, y, maxWidth, lineHeight = 5.2) {
    const lines = doc.splitTextToSize(String(text || '—'), maxWidth);
    doc.text(lines, x, y);
    return y + lines.length * lineHeight;
  }

  function sectionHeading(doc, number, title, y) {
    y = ensurePage(doc, y, 22);
    doc.setFillColor(11, 93, 87);
    doc.circle(23, y - 1.5, 4.2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text(String(number), 23, y + 1.4, { align: 'center' });
    doc.setTextColor(21, 49, 46);
    doc.setFontSize(12.5);
    doc.text(title, 31, y + 1, { maxWidth: 155 });
    doc.setFont(undefined, 'normal');
    return y + 9;
  }

  function addPdfFooter(doc) {
    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page);
      const width = doc.internal.pageSize.getWidth();
      const height = doc.internal.pageSize.getHeight();
      doc.setDrawColor(215, 228, 224);
      doc.line(18, height - 14, width - 18, height - 14);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(98, 116, 111);
      doc.text('GTO ATS · Plano de Segurança do Abordador', 18, height - 8);
      doc.text(`Página ${page} de ${pages}`, width - 18, height - 8, { align: 'right' });
    }
  }

  async function generatePdf() {
    save({ silent: true });
    overlay.classList.add('is-visible');
    overlay.setAttribute('aria-hidden', 'false');
    await new Promise((resolve) => setTimeout(resolve, 60));

    try {
      if (!window.jspdf?.jsPDF) throw new Error('jsPDF indisponível');
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
      const width = doc.internal.pageSize.getWidth();
      let y = 22;

      doc.setFillColor(11, 93, 87);
      doc.roundedRect(14, 14, width - 28, 50, 5, 5, 'F');
      doc.setTextColor(240, 211, 159);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.text('GTO ATS · MATERIAL DE APOIO AO ABORDADOR', 22, 26);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('Plano de Segurança do Abordador', 22, 39, { maxWidth: width - 44 });
      doc.setFontSize(9.6);
      doc.setFont(undefined, 'normal');
      doc.text('Grupo Temático Operacional de Atendimento a Tentativas de Suicídio', 22, 54, { maxWidth: width - 44 });
      y = 76;

      doc.setTextColor(21, 49, 46);
      doc.setFontSize(10);
      const name = document.getElementById('nome').value.trim();
      const unit = document.getElementById('unidade').value.trim();
      const reviewDate = document.getElementById('revisao').value;

      if (name) {
        doc.setFont(undefined, 'bold'); doc.text('Identificação:', 18, y);
        doc.setFont(undefined, 'normal'); doc.text(name, 48, y, { maxWidth: width - 66 });
        y += 6;
      }
      if (unit) {
        doc.setFont(undefined, 'bold'); doc.text('Unidade/lotação:', 18, y);
        doc.setFont(undefined, 'normal'); doc.text(unit, 48, y, { maxWidth: width - 66 });
        y += 6;
      }
      doc.setFont(undefined, 'bold'); doc.text('Gerado em:', 18, y);
      doc.setFont(undefined, 'normal'); doc.text(new Date().toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' }), 48, y);
      y += 6;
      if (reviewDate) {
        const date = new Date(`${reviewDate}T12:00:00`);
        if (!Number.isNaN(date.getTime())) {
          doc.setFont(undefined, 'bold'); doc.text('Revisar em:', 18, y);
          doc.setFont(undefined, 'normal'); doc.text(date.toLocaleDateString('pt-BR'), 48, y);
          y += 6;
        }
      }

      y += 5;
      doc.setFillColor(238, 246, 244);
      doc.roundedRect(18, y, width - 36, 23, 3, 3, 'F');
      doc.setTextColor(73, 95, 90);
      doc.setFontSize(9.2);
      y = writeWrapped(doc, 'Este plano é de uso pessoal. As respostas foram geradas no próprio dispositivo e não são enviadas à Coordenação do GTO ATS. Prepare e revise o plano preferencialmente em momento de estabilidade.', 22, y + 7, width - 44, 4.8) + 9;

      const sections = [
        ['1', 'Meus sinais de alerta', 'sinais'],
        ['2', 'O que consigo fazer sozinho para ganhar tempo', 'estrategias'],
        ['3', 'Pessoas, lugares e atividades que me ajudam', 'distracoes'],
        ['4', 'Minha rede de apoio pessoal e profissional', 'rede'],
        ['5', 'Onde busco ajuda quando minhas estratégias não bastam', 'servicos'],
        ['6', 'Como torno meu ambiente mais seguro', 'seguranca'],
        ['7', 'Meu plano de recuperação pós-ocorrência', 'pos'],
        ['8', 'O que me conecta à vida e merece ser protegido', 'razoes']
      ];

      sections.forEach(([number, title, id]) => {
        const value = document.getElementById(id).value.trim() || 'Ainda não preenchido.';
        const estimatedLines = doc.splitTextToSize(value, width - 44).length;
        y = ensurePage(doc, y, 18 + estimatedLines * 5.2);
        y = sectionHeading(doc, number, title, y);
        doc.setTextColor(73, 95, 90);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        y = writeWrapped(doc, value, 22, y, width - 44, 5.2) + 7;
      });

      const commitments = [
        ['c1', 'Dar tempo real para descompressão'],
        ['c2', 'Evitar isolamento automático'],
        ['c3', 'Observar sono e imagens intrusivas'],
        ['c4', 'Evitar usar álcool como regulador'],
        ['c5', 'Conversar com alguém de confiança'],
        ['c6', 'Buscar cuidado profissional quando necessário']
      ];
      y = ensurePage(doc, y, 48);
      doc.setTextColor(21, 49, 46);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text('Compromissos pós-ocorrência', 18, y);
      y += 7;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9.5);
      commitments.forEach(([id, label]) => {
        const checked = document.getElementById(id).checked;
        doc.setTextColor(checked ? 11 : 130, checked ? 93 : 130, checked ? 87 : 130);
        doc.text(`${checked ? '✓' : '○'} ${label}`, 22, y);
        y += 5.5;
      });

      y = ensurePage(doc, y + 4, 45);
      doc.setFillColor(255, 243, 241);
      doc.roundedRect(18, y, width - 36, 36, 3, 3, 'F');
      doc.setTextColor(111, 77, 73);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(10.5);
      doc.text('Ajuda imediata', 22, y + 8);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9.2);
      writeWrapped(doc, 'Se houver risco imediato, interrompa o preenchimento e procure suporte presencial ou serviço de urgência. SAMU: 192 · Corpo de Bombeiros: 193 · CVV: 188.', 22, y + 15, width - 44, 4.8);
      y += 44;

      y = ensurePage(doc, y, 30);
      doc.setTextColor(21, 49, 46);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9.8);
      doc.text('GTO ATS · Grupo Temático Operacional de Atendimento a Tentativas de Suicídio · CBMMG', 18, y, { maxWidth: width - 36 });
      y += 10;
      doc.setFont(undefined, 'normal');
      doc.setTextColor(98, 116, 111);
      doc.setFontSize(9);
      doc.text('Coordenação: Maj BM Richelmy Murta', 18, y);
      y += 6;
      writeWrapped(doc, 'Material de apoio ao abordador. Não substitui protocolos operacionais, avaliação em saúde ou atendimento de urgência.', 18, y, width - 36, 4.5);

      addPdfFooter(doc);
      doc.setProperties({
        title: 'Plano de Segurança do Abordador - GTO ATS',
        subject: 'Plano pessoal de segurança e autocuidado do abordador',
        author: 'Coordenação do GTO ATS'
      });
      doc.save('Plano-de-Seguranca-do-Abordador-GTO-ATS.pdf');
      notify('PDF gerado.');
    } catch (error) {
      console.error(error);
      notify('Não foi possível gerar o PDF neste navegador. Use Imprimir como alternativa.');
    } finally {
      overlay.classList.remove('is-visible');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  document.getElementById('pdfButton').addEventListener('click', generatePdf);
  window.addEventListener('pagehide', () => save({ silent: true }));
  load();
})();
