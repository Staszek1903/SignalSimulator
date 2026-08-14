const runButton = document.querySelector('#runButton');
const status = document.querySelector('#status');
const stateName = document.querySelector('#stateName');
const stateDescription = document.querySelector('#stateDescription');
const objectName = document.querySelector('#objectName');
const editorLabel = document.querySelector('#editorLabel');
const toast = document.querySelector('#toast');
const homeLink = document.querySelector('#homeLink');
const messagesLink = document.querySelector('#messagesLink');
const homeCanvas = document.querySelector('#homeCanvas');
const messagesCanvas = document.querySelector('#messagesCanvas');
const stateCanvas = document.querySelector('#stateCanvas');
const homeProperties = document.querySelector('#homeProperties');
const messageProperties = document.querySelector('#messageProperties');
const stateProperties = document.querySelector('#stateProperties');
const addState = document.querySelector('#addState');

let running = false;
let selectedState = document.querySelector('.state.active');

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('visible'), 1500);
}

function requestEditAccess() {
  const activeEditor = document.querySelector('.tile-name-input, .state-name-input, .trigger-editor, .action-editor, .detail-editor, .message-editor, .message-attribute-editor');
  if (!activeEditor) return true;
  const focusTarget = activeEditor.matches('input, select')
    ? activeEditor
    : activeEditor.querySelector('input:not(:disabled), select:not(:disabled)');
  focusTarget?.focus();
  showToast('Najpierw zakończ bieżącą edycję');
  return false;
}

function blockInteractionForInvalidObject(event) {
  const invalidName = document.querySelector('.tile-name-input.invalid, .state-name-input.invalid, .trigger-name-input.invalid');
  if (!invalidName) return;
  const deleteDraftObject = event.target.closest('.delete-object') === invalidName.closest('.object-tile')?.querySelector('.delete-object');
  const deleteDraftState = event.target.closest('.remove-mini-state') === invalidName.closest('.mini-state-item')?.querySelector('.remove-mini-state');
  const cancelDraftTrigger = event.target.closest('.cancel-trigger') === invalidName.closest('.trigger-editor')?.querySelector('.cancel-trigger');
  const insideActionEditor = invalidName.closest('.action-editor')?.contains(event.target);
  if (event.target === invalidName || invalidName.closest('.trigger-editor')?.contains(event.target) || insideActionEditor || deleteDraftObject || deleteDraftState || cancelDraftTrigger) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  invalidName.focus();
  if (event.type === 'pointerdown') {
    showToast(invalidName.dataset.validationError || 'Najpierw wpisz poprawną nazwę obiektu');
  }
}

document.addEventListener('pointerdown', blockInteractionForInvalidObject, true);
document.addEventListener('click', blockInteractionForInvalidObject, true);

runButton.addEventListener('click', () => {
  running = !running;
  runButton.textContent = running ? 'Ⅱ Zatrzymaj' : '▶ Uruchom';
  status.innerHTML = `<i></i> Symulacja ${running ? 'uruchomiona' : 'zatrzymana'}`;
  status.parentElement.classList.toggle('running', running);
});

function selectStateNode(state) {
  selectedState?.classList.remove('active');
  selectedState = state;
  selectedState.classList.add('active');
  stateName.value = state.dataset.state;
  stateDescription.value = state.dataset.description;
  const actionList = document.querySelector('#actionList');
  actionList.replaceChildren();
  const tile = [...document.querySelectorAll('.object-tile')].find((item) => item.dataset.tileId === state.dataset.sourceTile);
  const onStart = [...(tile?.querySelectorAll('[data-trigger-type="onStart"]') || [])]
    .find((trigger) => trigger.dataset.triggerState === state.dataset.sourceState);
  (onStart?.actionItems || []).forEach((action) => {
    const item = document.createElement('li');
    const type = document.createElement('span');
    type.textContent = action.type;
    const value = document.createElement('code');
    value.textContent = actionArgumentsText(action, onStart);
    item.append(type, value);
    actionList.append(item);
  });
  if (!actionList.children.length) {
    const empty = document.createElement('li');
    empty.textContent = 'Brak akcji onStart';
    actionList.append(empty);
  }
}

document.addEventListener('click', (event) => {
  const state = event.target.closest('.state');
  if (state) selectStateNode(state);
});

stateName.addEventListener('input', () => {
  if (!selectedState) return;
  selectedState.dataset.state = stateName.value;
  selectedState.querySelector('strong').textContent = stateName.value.toUpperCase();
  if (!stateName.value.trim()) return;
  const tile = [...document.querySelectorAll('.object-tile')].find((item) => item.dataset.tileId === selectedState.dataset.sourceTile);
  const oldKey = selectedState.dataset.sourceState;
  const source = [...(tile?.querySelectorAll('.mini-state') || [])].find((state) => state.dataset.filterState === oldKey);
  if (!source) return;
  const newKey = stateKey(stateName.value);
  const dot = source.querySelector('i');
  const current = source.querySelector('em');
  source.dataset.filterState = newKey;
  source.replaceChildren(dot, document.createTextNode(stateName.value.trim().toUpperCase()));
  if (current) source.append(current);
  tile.querySelectorAll('[data-trigger-state]').forEach((trigger) => {
    if (trigger.dataset.triggerState === oldKey) trigger.dataset.triggerState = newKey;
  });
  selectedState.dataset.sourceState = newKey;
});

stateDescription.addEventListener('input', () => {
  if (!selectedState) return;
  selectedState.dataset.description = stateDescription.value;
  selectedState.querySelector('small').textContent = stateDescription.value;
  const tile = [...document.querySelectorAll('.object-tile')].find((item) => item.dataset.tileId === selectedState.dataset.sourceTile);
  const source = [...(tile?.querySelectorAll('.mini-state') || [])]
    .find((state) => state.dataset.filterState === selectedState.dataset.sourceState);
  if (source) source.dataset.description = stateDescription.value;
});

function renderObjectStateCanvas(tile) {
  const help = document.createElement('p');
  help.className = 'canvas-help';
  help.textContent = 'Kliknij stan, aby zobaczyć jego właściwości.';
  stateCanvas.replaceChildren(help);
  [...tile.querySelectorAll('.mini-state')].forEach((source, index) => {
    const name = stateButtonName(source);
    const key = source.dataset.filterState;
    const node = document.createElement('button');
    node.className = `state${source.classList.contains('selected') ? ' active' : ''}`;
    node.type = 'button';
    node.dataset.tileId = `editor-${tile.dataset.tileId}-${key}`;
    node.dataset.sourceTile = tile.dataset.tileId;
    node.dataset.sourceState = key;
    node.dataset.state = name;
    node.dataset.description = source.dataset.description || (source.classList.contains('current') ? 'Stan aktualny' : 'Stan obiektu');
    node.style.left = `${40 + (index % 3) * 210}px`;
    node.style.top = `${80 + Math.floor(index / 3) * 125}px`;
    node.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><strong></strong><small></small>`;
    node.querySelector('strong').textContent = name.toUpperCase();
    node.querySelector('small').textContent = node.dataset.description;
    stateCanvas.append(node);
    makeDraggable(node);
  });
  const active = stateCanvas.querySelector('.state.active') || stateCanvas.querySelector('.state');
  if (active) selectStateNode(active);
  else {
    selectedState = null;
    stateName.value = '';
    stateDescription.value = '';
  }
}

function openObject(name) {
  const tile = [...document.querySelectorAll('.object-tile')].find((object) => object.dataset.object === name);
  if (!tile) return;
  homeLink.classList.remove('active');
  messagesLink.classList.remove('active');
  document.querySelectorAll('.object').forEach((item) => {
    item.classList.toggle('active', item.dataset.object === name);
  });
  homeCanvas.classList.add('hidden');
  messagesCanvas.classList.add('hidden');
  stateCanvas.classList.remove('hidden');
  homeProperties.classList.add('hidden');
  messageProperties.classList.add('hidden');
  stateProperties.classList.remove('hidden');
  editorLabel.textContent = 'EDYTOWANY OBIEKT';
  objectName.textContent = name;
  addState.textContent = '＋ Dodaj stan';
  renderObjectStateCanvas(tile);
  showToast(`Wybrano obiekt: ${name}`);
}

function openHome() {
  homeLink.classList.add('active');
  messagesLink.classList.remove('active');
  document.querySelectorAll('.object').forEach((item) => item.classList.remove('active'));
  homeCanvas.classList.remove('hidden');
  messagesCanvas.classList.add('hidden');
  stateCanvas.classList.add('hidden');
  homeProperties.classList.remove('hidden');
  messageProperties.classList.add('hidden');
  stateProperties.classList.add('hidden');
  editorLabel.textContent = 'PROJEKT';
  objectName.textContent = 'Okno główne';
  addState.textContent = '＋ Dodaj obiekt';
}

function openMessages() {
  homeLink.classList.remove('active');
  messagesLink.classList.add('active');
  document.querySelectorAll('.object').forEach((item) => item.classList.remove('active'));
  homeCanvas.classList.add('hidden');
  stateCanvas.classList.add('hidden');
  messagesCanvas.classList.remove('hidden');
  homeProperties.classList.add('hidden');
  stateProperties.classList.add('hidden');
  messageProperties.classList.remove('hidden');
  editorLabel.textContent = 'PROJEKT';
  objectName.textContent = 'Wiadomości';
  addState.textContent = '+ Dodaj wiadomość';
}

homeLink.addEventListener('click', openHome);
messagesLink.addEventListener('click', openMessages);
document.addEventListener('click', (event) => {
  const object = event.target.closest('.object, .open-object');
  if (object) openObject(object.dataset.object);
});

function selectMiniState(tile, stateButton) {
  tile.querySelectorAll('.mini-state').forEach((button) => button.classList.remove('selected'));
  stateButton?.classList.add('selected');
  const selected = stateButton?.dataset.filterState;
  let visibleCount = 0;
  tile.querySelectorAll('[data-trigger-state]').forEach((trigger) => {
    const visible = Boolean(selected) && trigger.dataset.triggerState === selected;
    trigger.hidden = !visible;
    if (visible) visibleCount += 1;
  });
  tile.querySelector('.trigger-count').textContent = visibleCount;
}

document.addEventListener('click', (event) => {
  const stateButton = event.target.closest('.mini-state');
  if (stateButton) selectMiniState(stateButton.closest('.object-tile'), stateButton);
});

function triggerIcon(type) {
  return type === 'timer' ? '◷' : type === 'onStart' ? '▶' : '✉';
}

function parseAction(text) {
  const separator = text.indexOf(':');
  const value = separator >= 0 ? text.slice(separator + 1).trim() : text.trim();
  if (text.toLocaleLowerCase('pl').startsWith('wyślij message:')) return { type: 'sendMessage', args: [value] };
  if (text.toLocaleLowerCase('pl').startsWith('uruchom timer:')) return { type: 'startTimer', args: [value] };
  if (text.toLocaleLowerCase('pl').startsWith('zmień stan:')) return { type: 'changeState', args: [value] };
  if (text.toLocaleLowerCase('pl').startsWith('ustaw atrybut:')) {
    const equals = value.indexOf('=');
    return { type: 'setAttribute', args: equals >= 0 ? [value.slice(0, equals).trim(), value.slice(equals + 1).trim()] : [value, ''] };
  }
  return { type: 'legacy', args: [text] };
}

function normalizeSetExpression(value) {
  if (value && typeof value === 'object') return value;
  return {
    left: { kind: 'literal', value: value || '' },
    operator: 'assign',
    right: { kind: 'literal', value: '' }
  };
}

function operandText(operand) {
  return operand.kind === 'attribute' ? `@${operand.value}` : operand.value;
}

function actionText(action) {
  if (action.type === 'setAttribute') {
    const expression = normalizeSetExpression(action.args[1]);
    const value = expression.operator === 'assign'
      ? operandText(expression.left)
      : `${operandText(expression.left)} ${expression.operator} ${operandText(expression.right)}`;
    return `set attribute: ${action.args[0]} = ${value}`;
  }
  if (action.type === 'sendMessage') return `send message: ${action.args[0]}`;
  if (action.type === 'startTimer') return `start timer: ${action.args[0]}`;
  if (action.type === 'changeState') return `change state: ${action.args[0]}`;
  return action.args[0];
}

function actionArgumentsText(action, trigger) {
  if (action.type === 'setAttribute') {
    const expression = normalizeSetExpression(action.args[1]);
    const value = expression.operator === 'assign'
      ? operandText(expression.left)
      : `${operandText(expression.left)} ${expression.operator} ${operandText(expression.right)}`;
    return `${action.args[0]} = ${value}`;
  }
  if (action.type === 'sendMessage') {
    const values = action.args[1] || {};
    const argumentsText = Object.entries(values).map(([name, value]) => `${name}: ${value}`).join(', ');
    return argumentsText ? `${action.args[0]} { ${argumentsText} }` : action.args[0];
  }
  if (action.type === 'changeState') {
    const state = [...trigger.closest('.object-tile').querySelectorAll('.mini-state')]
      .find((button) => (
        button.dataset.filterState === action.args[0]
        || stateButtonName(button).toLocaleLowerCase('pl') === action.args[0].toLocaleLowerCase('pl')
      ));
    return state ? stateButtonName(state) : action.args[0];
  }
  return action.args[0];
}

function actionTypeIcon(action) {
  if (action.type === 'setAttribute') return '=';
  if (action.type === 'sendMessage') return '✉';
  if (action.type === 'startTimer') return '◷';
  if (action.type === 'changeState') return '→';
  return '•';
}

function detailNames(tile, kind) {
  return [...tile.querySelectorAll(`[data-kind="${kind}"] .detail-row`)]
    .map((row) => row.dataset.name?.trim())
    .filter(Boolean);
}

function renderTrigger(trigger) {
  let type = trigger.dataset.triggerType;
  let triggerName = trigger.dataset.triggerName;
  if (!triggerName) {
    const oldIcon = trigger.querySelector('.trigger-icon');
    type = oldIcon?.classList.contains('timer') ? 'timer' : oldIcon?.classList.contains('onstart') ? 'onStart' : 'message';
    triggerName = [...trigger.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent.trim())
      .join(' ');
    trigger.dataset.triggerType = type;
    trigger.dataset.triggerName = triggerName;
  }
  if (type === 'onStart') {
    triggerName = 'onStart';
    trigger.dataset.triggerName = 'onStart';
  }
  if (type === 'timer') {
    const timers = detailNames(trigger.closest('.object-tile'), 'timer');
    const canonicalTimer = timers.find((timer) => timer.toLocaleLowerCase('pl') === triggerName.toLocaleLowerCase('pl'));
    if (canonicalTimer) {
      triggerName = canonicalTimer;
      trigger.dataset.triggerName = canonicalTimer;
    }
  }
  if (!trigger.actionItems) {
    trigger.actionItems = (trigger.dataset.actions || '').split('|').filter(Boolean).map(parseAction);
  }
  const actions = trigger.actionItems;
  const details = document.createElement('details');
  details.className = 'trigger-details';
  const summary = document.createElement('summary');
  const icon = document.createElement('span');
  icon.className = `trigger-icon ${type === 'onStart' ? 'onstart' : type}`;
  icon.title = type;
  icon.setAttribute('aria-label', type);
  icon.textContent = triggerIcon(type);
  const name = document.createElement('span');
  name.className = 'trigger-name';
  name.textContent = triggerName;
  const controls = document.createElement('span');
  controls.className = 'trigger-controls';
  controls.innerHTML = '<button class="trigger-control edit-trigger" type="button" title="Edytuj trigger">✎</button><button class="trigger-control delete-trigger" type="button" title="Usuń trigger">×</button>';
  summary.append(icon, name, controls);
  const actionList = document.createElement('div');
  actionList.className = 'trigger-actions';
  const actionHead = document.createElement('div');
  actionHead.className = 'trigger-actions-head';
  actionHead.innerHTML = '<span>AKCJE</span><button class="add-trigger-action" type="button">+ Dodaj</button>';
  actionList.append(actionHead);

  actions.forEach((action, index) => {
    const row = document.createElement('div');
    row.className = 'trigger-action';
    row.dataset.actionIndex = index;
    const number = document.createElement('i');
    number.textContent = `${index + 1}.`;
    const typeIcon = document.createElement('span');
    typeIcon.className = `action-type-icon ${action.type}`;
    typeIcon.textContent = actionTypeIcon(action);
    typeIcon.title = action.type;
    typeIcon.setAttribute('aria-label', action.type);
    const text = document.createElement('span');
    text.textContent = actionArgumentsText(action, trigger);
    const controls = document.createElement('span');
    controls.className = 'action-controls';
    controls.innerHTML = '<button class="action-control edit-trigger-action" type="button" title="Edytuj akcję">✎</button><button class="action-control delete-trigger-action" type="button" title="Usuń akcję">×</button>';
    row.append(number, typeIcon, text, controls);
    actionList.append(row);
  });

  details.append(summary, actionList);
  trigger.replaceChildren(details);
}

document.querySelectorAll('[data-actions]').forEach(renderTrigger);
document.querySelectorAll('.object-tile').forEach((tile) => {
  tile.querySelectorAll('[data-trigger-type="onStart"]').forEach((trigger) => placeOnStartFirst(tile, trigger));
});

document.addEventListener('click', (event) => {
  const deleteButton = event.target.closest('.delete-object');
  if (deleteButton) {
    event.preventDefault();
    event.stopPropagation();

    const tile = deleteButton.closest('.object-tile');
    const name = tile.dataset.object;
    const displayName = name || 'nienazwany obiekt';
    if (!window.confirm(`Usunąć obiekt „${displayName}”?`)) return;

    [...document.querySelectorAll('.sidebar .object')].find((object) => object.dataset.object === name)?.remove();
    localStorage.removeItem(`kaw-position-${tile.dataset.tileId}`);
    tile.remove();
    document.querySelector('#homeProperties .summary-row strong').textContent = document.querySelectorAll('.object-tile').length;
    showToast(`Usunięto obiekt: ${displayName}`);
  }
});

function createObject() {
  if (!requestEditAccess()) return;
  const name = '';
  const id = `object-${Date.now()}`;
  const initial = '?';
  const sidebarButton = document.createElement('button');
  sidebarButton.className = 'object';
  sidebarButton.dataset.object = name;
  sidebarButton.innerHTML = '<span class="object-icon"></span><span><strong></strong><small>brak stanów</small></span>';
  sidebarButton.querySelector('.object-icon').textContent = initial;
  sidebarButton.querySelector('strong').textContent = 'Nienazwany obiekt';
  document.querySelector('.sidebar').append(sidebarButton);

  const tile = document.createElement('article');
  tile.className = 'object-tile';
  tile.dataset.object = name;
  tile.dataset.tileId = id;
  tile.innerHTML = `
    <div class="tile-head drag-handle">
      <span class="tile-icon"></span><span><strong></strong><small>0 atrybutów</small></span>
      <button class="toggle-details" type="button" title="Atrybuty i timery" aria-label="Pokaż atrybuty i timery">AT</button>
      <button class="open-object" type="button" title="Otwórz stany">→</button>
    </div>
    <button class="delete-object" type="button" title="Usuń obiekt">×</button>
    <div class="tile-section"><span class="tile-label">STANY</span><div class="state-list"><small>Brak stanów</small></div></div>
    <div class="tile-section triggers"><span class="tile-label">TRIGGERY <b class="trigger-count">0</b></span><ul></ul></div>`;
  tile.querySelector('.open-object').dataset.object = name;
  tile.querySelector('.tile-icon').textContent = initial;
  tile.querySelector('.tile-head strong').textContent = name.toUpperCase();
  tile.querySelector('.delete-object').setAttribute('aria-label', `Usuń obiekt ${name}`);
  const index = document.querySelectorAll('.object-tile').length;
  tile.style.left = `${24 + (index % 3) * 285}px`;
  tile.style.top = `${80 + Math.floor(index / 3) * 210}px`;
  homeCanvas.append(tile);
  setupObjectDetails(tile);
  setupStateControls(tile);
  setupTriggerControls(tile);
  makeDraggable(tile);
  document.querySelector('#homeProperties .summary-row strong').textContent = index + 1;

  const title = tile.querySelector('.tile-head strong');
  const input = document.createElement('input');
  input.className = 'tile-name-input invalid';
  input.value = name;
  input.placeholder = 'Wpisz nazwę obiektu';
  input.setAttribute('aria-label', 'Nazwa obiektu');
  input.setAttribute('aria-invalid', 'true');
  input.dataset.validationError = 'Nazwa obiektu nie może być pusta';
  title.replaceWith(input);
  let nameCommitted = false;

  function validateName(showMessage = true) {
    const candidate = input.value.trim();
    const duplicate = [...document.querySelectorAll('.sidebar .object')].some((object) => (
      object !== sidebarButton
      && object.dataset.object.trim().toLocaleLowerCase('pl') === candidate.toLocaleLowerCase('pl')
    ));
    const error = !candidate
      ? 'Nazwa obiektu nie może być pusta'
      : duplicate ? 'Obiekt o tej nazwie już istnieje' : '';

    input.classList.toggle('invalid', Boolean(error));
    input.toggleAttribute('aria-invalid', Boolean(error));
    input.dataset.validationError = error;
    if (error && showMessage) showToast(error);
    return !error;
  }

  function finishNameEdit() {
    if (nameCommitted) return;
    if (!validateName()) {
      requestAnimationFrame(() => input.focus());
      return;
    }
    nameCommitted = true;
    const finalName = input.value.trim();
    tile.dataset.object = finalName;
    tile.querySelector('.open-object').dataset.object = finalName;
    tile.querySelector('.open-object').setAttribute('aria-label', `Otwórz stany obiektu ${finalName}`);
    tile.querySelector('.delete-object').setAttribute('aria-label', `Usuń obiekt ${finalName}`);
    sidebarButton.dataset.object = finalName;
    sidebarButton.querySelector('strong').textContent = finalName;
    sidebarButton.querySelector('.object-icon').textContent = finalName.charAt(0).toUpperCase();
    tile.querySelector('.tile-icon').textContent = finalName.charAt(0).toUpperCase();
    const heading = document.createElement('strong');
    heading.textContent = finalName.toUpperCase();
    input.replaceWith(heading);
    showToast(`Dodano obiekt: ${finalName}`);
  }

  input.addEventListener('pointerdown', (event) => event.stopPropagation());
  input.addEventListener('click', (event) => event.stopPropagation());
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finishNameEdit();
    }
  });
  input.addEventListener('input', () => validateName(false));
  input.addEventListener('blur', finishNameEdit);
  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
}

function editExistingObjectName(tile) {
  if (!requestEditAccess()) return;
  if (tile.querySelector('.tile-name-input')) return;
  const title = tile.querySelector('.tile-head strong');
  const oldName = tile.dataset.object;
  const sidebarButton = [...document.querySelectorAll('.sidebar .object')]
    .find((object) => object.dataset.object === oldName);
  if (!title || !sidebarButton) return;

  const input = document.createElement('input');
  input.className = 'tile-name-input';
  input.value = oldName;
  input.setAttribute('aria-label', 'Nazwa obiektu');
  title.replaceWith(input);
  let finished = false;

  function validateName(showMessage = true) {
    const candidate = input.value.trim();
    const duplicate = [...document.querySelectorAll('.sidebar .object')].some((object) => (
      object !== sidebarButton
      && object.dataset.object.trim().toLocaleLowerCase('pl') === candidate.toLocaleLowerCase('pl')
    ));
    const error = !candidate
      ? 'Nazwa obiektu nie może być pusta'
      : duplicate ? 'Obiekt o tej nazwie już istnieje' : '';
    input.classList.toggle('invalid', Boolean(error));
    input.toggleAttribute('aria-invalid', Boolean(error));
    input.dataset.validationError = error;
    if (error && showMessage) showToast(error);
    return !error;
  }

  function finishEdit() {
    if (finished) return;
    if (!validateName()) {
      requestAnimationFrame(() => input.focus());
      return;
    }
    finished = true;
    const newName = input.value.trim();
    tile.dataset.object = newName;
    tile.querySelector('.open-object').dataset.object = newName;
    tile.querySelector('.open-object').setAttribute('aria-label', `Otwórz stany obiektu ${newName}`);
    tile.querySelector('.delete-object').setAttribute('aria-label', `Usuń obiekt ${newName}`);
    tile.querySelector('.tile-icon').textContent = newName.charAt(0).toUpperCase();
    sidebarButton.dataset.object = newName;
    sidebarButton.querySelector('strong').textContent = newName;
    sidebarButton.querySelector('.object-icon').textContent = newName.charAt(0).toUpperCase();
    const heading = document.createElement('strong');
    heading.textContent = newName.toUpperCase();
    input.replaceWith(heading);
    showToast(`Zmieniono nazwę na: ${newName}`);
  }

  input.addEventListener('pointerdown', (event) => event.stopPropagation());
  input.addEventListener('click', (event) => event.stopPropagation());
  input.addEventListener('input', () => validateName(false));
  input.addEventListener('blur', finishEdit);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finishEdit();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      input.value = oldName;
      finishEdit();
    }
  });
  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
}

document.addEventListener('pointerdown', (event) => {
  const title = event.target.closest('.object-tile .tile-head strong');
  if (!title || event.button !== 0) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  editExistingObjectName(title.closest('.object-tile'));
}, true);

function stateButtonName(button) {
  return [...button.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent.trim())
    .join(' ');
}

function stateKey(name) {
  return name.trim().toLocaleLowerCase('pl').replace(/\s+/g, '-');
}

function updateStateCount(tile) {
  const count = tile.querySelectorAll('.mini-state').length;
  const sidebarItem = [...document.querySelectorAll('.sidebar .object')]
    .find((object) => object.dataset.object === tile.dataset.object);
  if (sidebarItem) sidebarItem.querySelector('small').textContent = `${count} ${count === 1 ? 'stan' : 'stany'}`;
}

function createStateButton(name, key, classes = []) {
  const button = document.createElement('button');
  button.className = ['mini-state', ...classes].join(' ');
  button.type = 'button';
  button.dataset.filterState = key;
  const dot = document.createElement('i');
  button.append(dot, document.createTextNode(name.toUpperCase()));
  if (classes.includes('current')) {
    const current = document.createElement('em');
    current.textContent = 'aktualny';
    button.append(current);
  }
  return button;
}

function beginStateNameEdit(tile, wrapper, isNew = false) {
  if (!requestEditAccess()) return;
  if (tile.querySelector('.state-name-input')) return;
  const oldButton = wrapper.querySelector('.mini-state');
  const oldName = oldButton ? stateButtonName(oldButton) : '';
  const oldKey = oldButton?.dataset.filterState || '';
  const input = document.createElement('input');
  input.className = `state-name-input${isNew ? ' invalid' : ''}`;
  input.value = oldName;
  input.placeholder = 'Nazwa stanu';
  input.setAttribute('aria-label', 'Nazwa stanu');
  if (isNew) {
    input.setAttribute('aria-invalid', 'true');
    input.dataset.validationError = 'Nazwa stanu nie może być pusta';
  }
  if (oldButton) oldButton.classList.add('hidden');
  wrapper.prepend(input);
  let finished = false;

  function validate(showMessage = true) {
    const candidate = input.value.trim();
    const duplicate = [...tile.querySelectorAll('.mini-state')].some((button) => (
      button !== oldButton && stateButtonName(button).toLocaleLowerCase('pl') === candidate.toLocaleLowerCase('pl')
    ));
    const error = !candidate
      ? 'Nazwa stanu nie może być pusta'
      : duplicate ? 'Stan o tej nazwie już istnieje' : '';
    input.classList.toggle('invalid', Boolean(error));
    input.toggleAttribute('aria-invalid', Boolean(error));
    input.dataset.validationError = error;
    if (error && showMessage) showToast(error);
    return !error;
  }

  function finish() {
    if (finished) return;
    if (!validate()) {
      requestAnimationFrame(() => input.focus());
      return;
    }
    finished = true;
    const newName = input.value.trim();
    const newKey = stateKey(newName);
    let button = oldButton;
    if (button) {
      button.dataset.filterState = newKey;
      const dot = button.querySelector('i');
      const current = button.querySelector('em');
      button.replaceChildren(dot, document.createTextNode(newName.toUpperCase()));
      if (current) button.append(current);
      tile.querySelectorAll('[data-trigger-state]').forEach((trigger) => {
        if (trigger.dataset.triggerState === oldKey) trigger.dataset.triggerState = newKey;
      });
      button.classList.remove('hidden');
    } else {
      button = createStateButton(newName, newKey);
      wrapper.prepend(button);
    }
    input.remove();
    tile.querySelector('.state-list > small')?.remove();
    updateStateCount(tile);
    selectMiniState(tile, button);
    showToast(`${isNew ? 'Dodano' : 'Zmieniono'} stan: ${newName}`);
  }

  input.addEventListener('input', () => validate(false));
  input.addEventListener('blur', finish);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finish();
    }
    if (event.key === 'Escape' && !isNew) {
      event.preventDefault();
      input.value = oldName;
      finish();
    }
  });
  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
}

function setupStateControls(tile) {
  const stateList = tile.querySelector('.state-list');
  if (!stateList || tile.querySelector('.add-mini-state')) return;
  const label = stateList.closest('.tile-section').querySelector('.tile-label');
  const add = document.createElement('button');
  add.className = 'add-mini-state';
  add.type = 'button';
  add.textContent = '+ Dodaj';
  label.append(add);
  [...stateList.querySelectorAll(':scope > .mini-state')].forEach((button) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'mini-state-item';
    button.before(wrapper);
    wrapper.append(button);
    wrapper.insertAdjacentHTML('beforeend', '<button class="mini-state-action edit-mini-state" type="button" title="Edytuj stan">✎</button><button class="mini-state-action remove-mini-state" type="button" title="Usuń stan">×</button>');
  });
  updateStateCount(tile);
}

function addStateToTile(tile) {
  if (!requestEditAccess()) return;
  const stateList = tile.querySelector('.state-list');
  stateList.querySelector(':scope > small')?.remove();
  const wrapper = document.createElement('div');
  wrapper.className = 'mini-state-item';
  wrapper.innerHTML = '<button class="mini-state-action edit-mini-state" type="button" title="Edytuj stan">✎</button><button class="mini-state-action remove-mini-state" type="button" title="Usuń stan">×</button>';
  stateList.append(wrapper);
  beginStateNameEdit(tile, wrapper, true);
}

document.addEventListener('click', (event) => {
  const add = event.target.closest('.add-mini-state');
  if (add) {
    addStateToTile(add.closest('.object-tile'));
    return;
  }
  const edit = event.target.closest('.edit-mini-state');
  if (edit) {
    beginStateNameEdit(edit.closest('.object-tile'), edit.closest('.mini-state-item'));
    return;
  }
  const remove = event.target.closest('.remove-mini-state');
  if (remove) {
    const wrapper = remove.closest('.mini-state-item');
    const tile = remove.closest('.object-tile');
    const button = wrapper.querySelector('.mini-state');
    const wasCurrent = button?.classList.contains('current');
    if (button && !window.confirm(`Usunąć stan „${stateButtonName(button)}”?`)) return;
    if (button) {
      tile.querySelectorAll('[data-trigger-state]').forEach((trigger) => {
        if (trigger.dataset.triggerState === button.dataset.filterState) trigger.remove();
      });
    }
    wrapper.remove();
    const nextState = tile.querySelector('.mini-state');
    if (wasCurrent && nextState) {
      nextState.classList.add('current');
      if (!nextState.querySelector('em')) {
        const current = document.createElement('em');
        current.textContent = 'aktualny';
        nextState.append(current);
      }
    }
    if (!tile.querySelector('.mini-state')) {
      const empty = document.createElement('small');
      empty.textContent = 'Brak stanów';
      tile.querySelector('.state-list').append(empty);
    }
    updateStateCount(tile);
    selectMiniState(tile, nextState);
    showToast('Usunięto stan');
  }
});

function refreshTriggerList(tile) {
  selectMiniState(tile, tile.querySelector('.mini-state.selected') || tile.querySelector('.mini-state'));
}

function placeOnStartFirst(tile, trigger) {
  if (trigger.dataset.triggerType !== 'onStart') return;
  const firstForState = [...tile.querySelectorAll('.triggers li[data-trigger-state]')]
    .find((other) => other !== trigger && other.dataset.triggerState === trigger.dataset.triggerState);
  if (firstForState) firstForState.before(trigger);
}

function beginTriggerEdit(tile, trigger = null) {
  if (!requestEditAccess()) return;
  if (tile.querySelector('.trigger-editor')) return;
  const states = [...tile.querySelectorAll('.mini-state')];
  if (!states.length) {
    showToast('Najpierw dodaj stan');
    return;
  }
  const selectedStateButton = tile.querySelector('.mini-state.selected') || states[0];
  if (!tile.querySelector('.mini-state.selected')) selectMiniState(tile, selectedStateButton);
  const isNew = !trigger;
  if (isNew) {
    trigger = document.createElement('li');
    trigger.dataset.actions = '';
    trigger.dataset.triggerState = selectedStateButton.dataset.filterState;
    trigger.dataset.triggerType = 'message';
    trigger.dataset.triggerName = '';
    tile.querySelector('.triggers ul').append(trigger);
  }
  const details = trigger.querySelector('.trigger-details');
  details?.classList.add('hidden');
  trigger.hidden = false;
  const editor = document.createElement('div');
  editor.className = 'trigger-editor';
  editor.innerHTML = `
    <select class="trigger-type-input" aria-label="Typ triggera">
      <option value="message">message</option><option value="timer">timer</option><option value="onStart">onStart</option>
    </select>
    <input class="trigger-name-input" aria-label="Nazwa triggera" placeholder="Nazwa triggera">
    <select class="trigger-name-input trigger-message-input hidden" aria-label="Wiadomość triggera"></select>
    <select class="trigger-name-input trigger-timer-input hidden" aria-label="Timer triggera"></select>
    <select class="trigger-state-input" aria-label="Stan triggera"></select>
    <div class="trigger-editor-actions"><button class="cancel-trigger" type="button">Anuluj</button><button class="save-trigger" type="button">Zapisz</button></div>`;
  const typeInput = editor.querySelector('.trigger-type-input');
  const nameInput = editor.querySelector('input.trigger-name-input');
  const messageInput = editor.querySelector('.trigger-message-input');
  const timerInput = editor.querySelector('.trigger-timer-input');
  const stateInput = editor.querySelector('.trigger-state-input');
  typeInput.value = trigger.dataset.triggerType || 'message';
  nameInput.value = trigger.dataset.triggerName || '';
  states.forEach((state) => stateInput.add(new Option(stateButtonName(state), state.dataset.filterState)));
  stateInput.value = trigger.dataset.triggerState;
  if (isNew) {
    stateInput.classList.add('hidden');
  }
  trigger.append(editor);

  let previousType = typeInput.value;
  function currentNameControl() {
    if (typeInput.value === 'timer') return timerInput;
    if (typeInput.value === 'message') return messageInput;
    return nameInput;
  }

  function syncTriggerNameControl() {
    timerInput.classList.toggle('hidden', typeInput.value !== 'timer');
    messageInput.classList.toggle('hidden', typeInput.value !== 'message');
    nameInput.classList.toggle('hidden', typeInput.value !== 'onStart');
    if (typeInput.value === 'message') {
      const desiredMessage = previousType === 'message' ? trigger.dataset.triggerName : '';
      const messages = messageNames();
      messageInput.replaceChildren(new Option(messages.length ? 'Wybierz wiadomość' : 'Brak wiadomości', ''));
      messages.forEach((message) => messageInput.add(new Option(message, message)));
      messageInput.value = messages.find((message) => message.toLocaleLowerCase('pl') === desiredMessage.toLocaleLowerCase('pl')) || '';
    }
    if (typeInput.value === 'timer') {
      const desiredTimer = previousType === 'timer' ? trigger.dataset.triggerName : '';
      const timers = detailNames(tile, 'timer');
      timerInput.replaceChildren(new Option(timers.length ? 'Wybierz timer' : 'Brak timerów', ''));
      timers.forEach((timer) => timerInput.add(new Option(timer, timer)));
      timerInput.value = timers.find((timer) => timer.toLocaleLowerCase('pl') === desiredTimer.toLocaleLowerCase('pl')) || '';
    }
    if (typeInput.value === 'onStart') {
      nameInput.value = 'onStart';
      nameInput.disabled = true;
      nameInput.title = 'Trigger onStart ma stałą nazwę';
    } else {
      nameInput.disabled = false;
      nameInput.title = '';
      if (previousType === 'onStart' && nameInput.value === 'onStart') nameInput.value = '';
    }
    previousType = typeInput.value;
  }
  syncTriggerNameControl();

  function validate(showMessage = true) {
    if (typeInput.value === 'onStart') nameInput.value = 'onStart';
    const nameControl = currentNameControl();
    const candidate = nameControl.value.trim();
    const repeatedOnStart = typeInput.value === 'onStart' && [...tile.querySelectorAll('[data-trigger-type="onStart"]')].some((other) => (
      other !== trigger && other.dataset.triggerState === stateInput.value
    ));
    const duplicate = [...tile.querySelectorAll('[data-trigger-name]')].some((other) => (
      other !== trigger
      && other.dataset.triggerState === stateInput.value
      && other.dataset.triggerName.toLocaleLowerCase('pl') === candidate.toLocaleLowerCase('pl')
    ));
    const error = repeatedOnStart
      ? 'Stan może mieć tylko jeden trigger onStart'
      : !candidate
      ? typeInput.value === 'timer' ? 'Wybierz dostępny timer'
        : typeInput.value === 'message' ? 'Wybierz dostępną wiadomość' : 'Nazwa triggera nie może być pusta'
      : duplicate ? 'Trigger o tej nazwie już istnieje w tym stanie' : '';
    [nameInput, messageInput, timerInput].forEach((control) => {
      control.classList.toggle('invalid', control === nameControl && Boolean(error));
      control.toggleAttribute('aria-invalid', control === nameControl && Boolean(error));
      control.dataset.validationError = control === nameControl ? error : '';
    });
    if (error && showMessage) showToast(error);
    return !error;
  }

  if (isNew) validate(false);
  nameInput.addEventListener('input', () => validate(false));
  messageInput.addEventListener('change', () => validate(false));
  timerInput.addEventListener('change', () => validate(false));
  typeInput.addEventListener('change', () => {
    syncTriggerNameControl();
    validate(false);
  });
  stateInput.addEventListener('change', () => validate(false));
  editor.querySelector('.save-trigger').addEventListener('click', () => {
    if (!validate()) {
      (typeInput.value === 'onStart' ? typeInput : currentNameControl()).focus();
      return;
    }
    trigger.dataset.triggerType = typeInput.value;
    trigger.dataset.triggerName = currentNameControl().value.trim();
    trigger.dataset.triggerState = stateInput.value;
    editor.remove();
    renderTrigger(trigger);
    placeOnStartFirst(tile, trigger);
    refreshTriggerList(tile);
    showToast(`${isNew ? 'Dodano' : 'Zmieniono'} trigger: ${trigger.dataset.triggerName}`);
  });
  editor.querySelector('.cancel-trigger').addEventListener('click', () => {
    if (isNew) trigger.remove();
    else {
      editor.remove();
      details.classList.remove('hidden');
      refreshTriggerList(tile);
    }
  });
  requestAnimationFrame(() => currentNameControl().focus());
}

function setupTriggerControls(tile) {
  if (tile.querySelector('.add-trigger')) return;
  const label = tile.querySelector('.triggers .tile-label');
  const add = document.createElement('button');
  add.className = 'add-trigger';
  add.type = 'button';
  add.textContent = '+ Dodaj';
  label.append(add);
}

document.addEventListener('click', (event) => {
  const add = event.target.closest('.add-trigger');
  if (add) {
    beginTriggerEdit(add.closest('.object-tile'));
    return;
  }
  const edit = event.target.closest('.edit-trigger');
  if (edit) {
    event.preventDefault();
    event.stopPropagation();
    beginTriggerEdit(edit.closest('.object-tile'), edit.closest('[data-trigger-state]'));
    return;
  }
  const remove = event.target.closest('.delete-trigger');
  if (remove) {
    event.preventDefault();
    event.stopPropagation();
    const trigger = remove.closest('[data-trigger-state]');
    const tile = trigger.closest('.object-tile');
    if (!window.confirm(`Usunąć trigger „${trigger.dataset.triggerName}”?`)) return;
    trigger.remove();
    refreshTriggerList(tile);
    showToast('Usunięto trigger');
  }
});

function beginActionEdit(trigger, actionIndex = null) {
  if (!requestEditAccess()) return;
  const actionList = trigger.querySelector('.trigger-actions');
  if (!actionList || actionList.querySelector('.action-editor')) return;
  const isNew = actionIndex === null;
  const original = isNew ? { type: 'setAttribute', args: ['', ''] } : trigger.actionItems[actionIndex];
  const oldRow = isNew ? null : actionList.querySelector(`[data-action-index="${actionIndex}"]`);
  oldRow?.classList.add('hidden');
  const editor = document.createElement('div');
  editor.className = 'action-editor';
  editor.innerHTML = `
    <select class="action-type-input" aria-label="Typ akcji">
      <option value="setAttribute">set attribute</option>
      <option value="sendMessage">send message</option>
      <option value="startTimer">start timer</option>
      <option value="changeState">changeState</option>
    </select>
    <div class="action-arguments"></div>
    <div class="action-editor-buttons"><button class="cancel-trigger-action" type="button">Anuluj</button><button class="save-trigger-action" type="button">Zapisz</button></div>`;
  const typeInput = editor.querySelector('.action-type-input');
  const argumentsBox = editor.querySelector('.action-arguments');
  typeInput.value = original.type === 'legacy' ? 'setAttribute' : original.type;

  function renderArguments(values = []) {
    argumentsBox.replaceChildren();
    if (typeInput.value === 'setAttribute') {
      argumentsBox.classList.add('single');
      const attributes = detailNames(trigger.closest('.object-tile'), 'attribute');
      const target = document.createElement('select');
      target.className = 'action-argument set-attribute-target';
      target.setAttribute('aria-label', 'Atrybut docelowy');
      target.add(new Option(attributes.length ? 'Wybierz atrybut docelowy' : 'Brak atrybutów', ''));
      attributes.forEach((attribute) => target.add(new Option(attribute, attribute)));
      target.value = attributes.find((attribute) => attribute.toLocaleLowerCase('pl') === (values[0] || '').toLocaleLowerCase('pl')) || '';
      argumentsBox.append(target);
      const expression = normalizeSetExpression(values[1]);
      const expressionRow = document.createElement('div');
      expressionRow.className = 'set-attribute-expression';

      function createOperand(side, operand) {
        const box = document.createElement('div');
        box.className = `set-operand set-operand-${side}`;
        const kind = document.createElement('select');
        kind.className = 'operand-kind';
        kind.innerHTML = '<option value="literal">literał</option><option value="attribute">atrybut</option>';
        kind.value = operand.kind;
        const valueHost = document.createElement('span');

        function renderValue(currentValue = '') {
          valueHost.replaceChildren();
          const value = kind.value === 'attribute' ? document.createElement('select') : document.createElement('input');
          value.className = 'action-argument operand-value';
          value.setAttribute('aria-label', `${side === 'left' ? 'Lewy' : 'Prawy'} operand`);
          if (kind.value === 'attribute') {
            value.add(new Option(attributes.length ? 'Wybierz atrybut' : 'Brak atrybutów', ''));
            attributes.forEach((attribute) => value.add(new Option(attribute, attribute)));
            value.value = attributes.find((attribute) => attribute.toLocaleLowerCase('pl') === currentValue.toLocaleLowerCase('pl')) || '';
          } else {
            value.placeholder = 'Literał';
            value.value = currentValue;
          }
          value.addEventListener('input', () => validate(false));
          value.addEventListener('change', () => validate(false));
          valueHost.append(value);
        }

        kind.addEventListener('change', () => renderValue());
        renderValue(operand.value);
        box.append(kind, valueHost);
        return box;
      }

      const left = createOperand('left', expression.left);
      const operator = document.createElement('select');
      operator.className = 'set-operator';
      operator.setAttribute('aria-label', 'Operator');
      [['assign', '='], ['+', '+'], ['-', '−'], ['*', '×'], ['/', '÷'], ['%', '%'], ['==', '=='], ['!=', '!='], ['>', '>'], ['<', '<'], ['>=', '>='], ['<=', '<='], ['&&', 'AND'], ['||', 'OR']]
        .forEach(([value, label]) => operator.add(new Option(label, value)));
      operator.value = expression.operator;
      const right = createOperand('right', expression.right);
      function updateRightVisibility() {
        right.classList.toggle('hidden', operator.value === 'assign');
      }
      operator.addEventListener('change', updateRightVisibility);
      updateRightVisibility();
      expressionRow.append(left, operator, right);
      argumentsBox.append(expressionRow);
      return;
    }
    if (typeInput.value === 'sendMessage') {
      argumentsBox.classList.add('single');
      const messages = messageNames();
      const messageSelect = document.createElement('select');
      messageSelect.className = 'action-argument action-message-select';
      messageSelect.setAttribute('aria-label', 'Wiadomość');
      messageSelect.add(new Option(messages.length ? 'Wybierz wiadomość' : 'Brak wiadomości', ''));
      messages.forEach((message) => messageSelect.add(new Option(message, message)));
      messageSelect.value = messages.find((message) => message.toLocaleLowerCase('pl') === (values[0] || '').toLocaleLowerCase('pl')) || '';
      argumentsBox.append(messageSelect);
      const attributeValues = values[1] || {};
      messageAttributes(messageSelect.value).forEach((attribute) => {
        const input = document.createElement('input');
        input.className = 'action-argument action-message-value';
        input.dataset.attributeName = attribute.name;
        input.setAttribute('aria-label', `Wartość ${attribute.name}`);
        input.placeholder = `${attribute.name} (${attribute.type})`;
        input.value = attributeValues[attribute.name] || '';
        input.addEventListener('input', () => validate(false));
        argumentsBox.append(input);
      });
      messageSelect.addEventListener('change', () => renderArguments([messageSelect.value, {}]));
      return;
    }
    const definitions = typeInput.value === 'startTimer'
          ? [['Timer', 'Nazwa timera']]
          : [['Stan', 'Stan docelowy']];
    argumentsBox.classList.toggle('single', definitions.length === 1);
    definitions.forEach(([label, placeholder], index) => {
      const selectsTimer = typeInput.value === 'startTimer';
      const input = typeInput.value === 'changeState' || selectsTimer
        ? document.createElement('select')
        : document.createElement('input');
      input.className = 'action-argument';
      input.setAttribute('aria-label', label);
      if (typeInput.value === 'changeState') {
        const states = [...trigger.closest('.object-tile').querySelectorAll('.mini-state')];
        input.add(new Option('Wybierz stan', ''));
        states.forEach((state) => input.add(new Option(stateButtonName(state), state.dataset.filterState)));
        const selectedState = states.find((state) => (
          state.dataset.filterState === values[index]
          || stateButtonName(state).toLocaleLowerCase('pl') === (values[index] || '').toLocaleLowerCase('pl')
        ));
        input.value = selectedState?.dataset.filterState || '';
      } else if (selectsTimer) {
        const timers = detailNames(trigger.closest('.object-tile'), 'timer');
        input.add(new Option(timers.length ? 'Wybierz timer' : 'Brak timerów', ''));
        timers.forEach((timer) => input.add(new Option(timer, timer)));
        const selectedTimer = timers.find((timer) => (
          timer.toLocaleLowerCase('pl') === (values[index] || '').toLocaleLowerCase('pl')
        ));
        input.value = selectedTimer || '';
      } else {
        input.placeholder = placeholder;
        input.value = values[index] || '';
      }
      input.addEventListener('input', () => validate(false));
      input.addEventListener('change', () => validate(false));
      argumentsBox.append(input);
    });
  }

  function validate(showMessage = true) {
    const inputs = [...argumentsBox.querySelectorAll('.action-argument')].filter((input) => !input.closest('.hidden'));
    const empty = inputs.find((input) => !input.value.trim());
    inputs.forEach((input) => input.classList.toggle('invalid', !input.value.trim()));
    if (empty) {
      empty.dataset.validationError = 'Uzupełnij wszystkie wymagane argumenty akcji';
      if (showMessage) showToast(empty.dataset.validationError);
      return false;
    }
    return true;
  }

  renderArguments(original.type === 'legacy' ? [original.args[0], ''] : original.args);
  typeInput.addEventListener('change', () => renderArguments());
  editor.querySelector('.save-trigger-action').addEventListener('click', () => {
    if (!validate()) {
      argumentsBox.querySelector('.invalid')?.focus();
      return;
    }
    let args;
    if (typeInput.value === 'setAttribute') {
      const operand = (side) => {
        const box = argumentsBox.querySelector(`.set-operand-${side}`);
        return {
          kind: box.querySelector('.operand-kind').value,
          value: box.querySelector('.operand-value').value.trim()
        };
      };
      args = [
        argumentsBox.querySelector('.set-attribute-target').value,
        {
          left: operand('left'),
          operator: argumentsBox.querySelector('.set-operator').value,
          right: operand('right')
        }
      ];
    } else if (typeInput.value === 'sendMessage') {
      const values = {};
      argumentsBox.querySelectorAll('.action-message-value').forEach((input) => {
        values[input.dataset.attributeName] = input.value.trim();
      });
      args = [argumentsBox.querySelector('.action-message-select').value, values];
    } else {
      args = [...argumentsBox.querySelectorAll('.action-argument')].map((input) => input.value.trim());
    }
    const action = { type: typeInput.value, args };
    if (isNew) trigger.actionItems.push(action);
    else trigger.actionItems[actionIndex] = action;
    trigger.dataset.actions = trigger.actionItems.map(actionText).join('|');
    renderTrigger(trigger);
    trigger.querySelector('.trigger-details').open = true;
    showToast(`${isNew ? 'Dodano' : 'Zmieniono'} akcję`);
  });
  editor.querySelector('.cancel-trigger-action').addEventListener('click', () => {
    editor.remove();
    oldRow?.classList.remove('hidden');
  });
  actionList.append(editor);
  requestAnimationFrame(() => argumentsBox.querySelector('input')?.focus());
}

document.addEventListener('click', (event) => {
  const add = event.target.closest('.add-trigger-action');
  if (add) {
    beginActionEdit(add.closest('[data-trigger-state]'));
    return;
  }
  const edit = event.target.closest('.edit-trigger-action');
  if (edit) {
    const row = edit.closest('.trigger-action');
    beginActionEdit(edit.closest('[data-trigger-state]'), Number(row.dataset.actionIndex));
    return;
  }
  const remove = event.target.closest('.delete-trigger-action');
  if (remove) {
    const trigger = remove.closest('[data-trigger-state]');
    const index = Number(remove.closest('.trigger-action').dataset.actionIndex);
    if (!window.confirm('Usunąć tę akcję?')) return;
    trigger.actionItems.splice(index, 1);
    trigger.dataset.actions = trigger.actionItems.map(actionText).join('|');
    renderTrigger(trigger);
    trigger.querySelector('.trigger-details').open = true;
    showToast('Usunięto akcję');
  }
});

const objectDetailSeeds = {
  Pralka: {
    attributes: [['number', 'waga', '0'], ['boolean', 'aktywna', 'false']],
    timers: [['oneShot', 'cyklPrania', '90 s']]
  },
  Robot: {
    attributes: [['number', 'pozycja', '0']],
    timers: [['oneShot', 'czasPracy', '30 s']]
  },
  Dispatcher: {
    attributes: [['number', 'rozmiarKolejki', '0']],
    timers: [['cyclic', 'sprawdźKolejkę', '5 s']]
  }
};

function createDetailRow(kind, values = []) {
  const row = document.createElement('div');
  row.className = 'detail-row';
  row.dataset.type = values[0] || (kind === 'attribute' ? 'string' : 'oneShot');
  row.dataset.name = values[1] || '';
  row.dataset.value = values[2] || '';
  renderDetailRow(row);
  return row;
}

function detailTypeIcon(kind, type) {
  if (kind === 'timer') return type === 'cyclic' ? '↻' : '1×';
  if (type === 'number') return '#';
  if (type === 'boolean') return '◉';
  return 'Aa';
}

function renderDetailRow(row) {
  const kind = row.closest('.details-section')?.dataset.kind || (['oneShot', 'cyclic'].includes(row.dataset.type) ? 'timer' : 'attribute');
  row.replaceChildren();
  const icon = document.createElement('span');
  icon.className = `detail-type-icon ${row.dataset.type}`;
  icon.textContent = detailTypeIcon(kind, row.dataset.type);
  icon.title = row.dataset.type;
  icon.setAttribute('aria-label', row.dataset.type);
  const content = document.createElement('span');
  content.className = 'detail-content';
  const name = document.createElement('strong');
  name.textContent = row.dataset.name;
  const value = document.createElement('small');
  value.textContent = row.dataset.value;
  content.append(name, value);
  const controls = document.createElement('span');
  controls.className = 'detail-controls';
  controls.innerHTML = '<button class="edit-detail" type="button" title="Edytuj">✎</button><button class="remove-detail" type="button" title="Usuń">×</button>';
  row.append(icon, content, controls);
}

function beginDetailEdit(section, row = null) {
  if (!requestEditAccess()) return;
  const isNew = !row;
  const list = section.querySelector('.details-list');
  if (isNew) {
    list.querySelector('.empty-details')?.remove();
    row = document.createElement('div');
    row.className = 'detail-row';
    list.append(row);
  }
  const kind = section.dataset.kind;
  const oldData = { type: row.dataset.type || '', name: row.dataset.name || '', value: row.dataset.value || '' };
  const editor = document.createElement('div');
  editor.className = 'detail-editor';
  editor.innerHTML = '<select class="detail-type-input" aria-label="Typ"></select><input class="detail-name-input" aria-label="Nazwa" placeholder="Nazwa"><input class="detail-value-input" aria-label="Wartość" placeholder="Wartość"><div class="detail-editor-actions"><button class="cancel-detail" type="button">Anuluj</button><button class="save-detail" type="button">Zapisz</button></div>';
  const typeInput = editor.querySelector('.detail-type-input');
  const nameInput = editor.querySelector('.detail-name-input');
  const valueInput = editor.querySelector('.detail-value-input');
  const types = kind === 'attribute'
    ? [['string', 'string'], ['number', 'number'], ['boolean', 'boolean']]
    : [['oneShot', 'jednorazowy'], ['cyclic', 'cykliczny']];
  types.forEach(([value, label]) => typeInput.add(new Option(label, value)));
  typeInput.value = oldData.type || types[0][0];
  nameInput.value = oldData.name;
  valueInput.value = oldData.value;
  if (kind === 'timer') valueInput.placeholder = 'np. 5 s';
  row.replaceChildren(editor);

  function validate(showMessage = true) {
    const duplicate = [...section.querySelectorAll('.detail-row')].some((other) => (
      other !== row && other.dataset.name?.toLocaleLowerCase('pl') === nameInput.value.trim().toLocaleLowerCase('pl')
    ));
    const error = !nameInput.value.trim() ? 'Nazwa nie może być pusta'
      : duplicate ? 'Pozycja o tej nazwie już istnieje'
        : !valueInput.value.trim() ? 'Wartość nie może być pusta' : '';
    nameInput.classList.toggle('invalid', !nameInput.value.trim() || duplicate);
    valueInput.classList.toggle('invalid', !valueInput.value.trim());
    if (error && showMessage) showToast(error);
    return !error;
  }

  editor.querySelector('.save-detail').addEventListener('click', () => {
    if (!validate()) return;
    row.dataset.type = typeInput.value;
    row.dataset.name = nameInput.value.trim();
    row.dataset.value = valueInput.value.trim();
    if (!isNew && oldData.name !== row.dataset.name) {
      const tile = section.closest('.object-tile');
      tile.querySelectorAll('[data-trigger-state]').forEach((trigger) => {
        trigger.actionItems?.forEach((action) => {
          if ((kind === 'attribute' && action.type === 'setAttribute') || (kind === 'timer' && action.type === 'startTimer')) {
            if (action.args[0] === oldData.name) action.args[0] = row.dataset.name;
          }
          if (kind === 'attribute' && action.type === 'setAttribute') {
            const expression = normalizeSetExpression(action.args[1]);
            [expression.left, expression.right].forEach((operand) => {
              if (operand.kind === 'attribute' && operand.value === oldData.name) operand.value = row.dataset.name;
            });
            action.args[1] = expression;
          }
        });
        if (kind === 'timer' && trigger.dataset.triggerType === 'timer' && trigger.dataset.triggerName === oldData.name) {
          trigger.dataset.triggerName = row.dataset.name;
        }
        renderTrigger(trigger);
      });
    }
    renderDetailRow(row);
    const tile = section.closest('.object-tile');
    updateAttributeCount(tile);
    synchronizeReferences(tile);
    showToast(`${isNew ? 'Dodano' : 'Zmieniono'} ${kind === 'attribute' ? 'atrybut' : 'timer'}`);
  });
  editor.querySelector('.cancel-detail').addEventListener('click', () => {
    if (isNew) {
      row.remove();
      updateEmptyDetails(list);
    } else {
      Object.assign(row.dataset, oldData);
      renderDetailRow(row);
    }
  });
  requestAnimationFrame(() => nameInput.focus());
}

function updateEmptyDetails(list) {
  list.querySelector('.empty-details')?.remove();
  if (!list.querySelector('.detail-row')) {
    const empty = document.createElement('p');
    empty.className = 'empty-details';
    empty.textContent = 'Brak pozycji';
    list.append(empty);
  }
}

function updateAttributeCount(tile) {
  const count = tile.querySelectorAll('[data-kind="attribute"] .detail-row').length;
  tile.querySelector('.tile-head small').textContent = `${count} ${count === 1 ? 'atrybut' : 'atrybuty'}`;
}

function synchronizeReferences(tile) {
  const attributes = detailNames(tile, 'attribute');
  const timers = detailNames(tile, 'timer');
  tile.querySelectorAll('[data-trigger-state]').forEach((trigger) => {
    if (trigger.dataset.triggerType === 'timer' && timers.length) {
      trigger.dataset.triggerName = timers.find((timer) => (
        timer.toLocaleLowerCase('pl') === (trigger.dataset.triggerName || '').toLocaleLowerCase('pl')
      )) || timers[0];
    }
    trigger.actionItems?.forEach((action) => {
      if (action.type === 'setAttribute' && attributes.length) {
        action.args[0] = attributes.find((attribute) => (
          attribute.toLocaleLowerCase('pl') === (action.args[0] || '').toLocaleLowerCase('pl')
        )) || attributes[0];
        const expression = normalizeSetExpression(action.args[1]);
        [expression.left, expression.right].forEach((operand) => {
          if (operand.kind !== 'attribute') return;
          operand.value = attributes.find((attribute) => (
            attribute.toLocaleLowerCase('pl') === (operand.value || '').toLocaleLowerCase('pl')
          )) || attributes[0];
        });
        action.args[1] = expression;
      }
      if (action.type === 'startTimer' && timers.length) {
        action.args[0] = timers.find((timer) => (
          timer.toLocaleLowerCase('pl') === (action.args[0] || '').toLocaleLowerCase('pl')
        )) || timers[0];
      }
    });
    trigger.dataset.actions = trigger.actionItems?.map(actionText).join('|') || trigger.dataset.actions;
    renderTrigger(trigger);
  });
}

function setupObjectDetails(tile) {
  if (tile.querySelector('.object-details')) return;
  const seed = objectDetailSeeds[tile.dataset.object] || { attributes: [], timers: [] };
  const panel = document.createElement('aside');
  panel.className = 'object-details hidden';
  panel.innerHTML = `
    <section class="details-section" data-kind="attribute">
      <div class="details-heading"><span>ATRYBUTY</span><button class="add-detail" type="button">+ Dodaj</button></div>
      <div class="details-list"></div>
    </section>
    <section class="details-section" data-kind="timer">
      <div class="details-heading"><span>TIMERY</span><button class="add-detail" type="button">+ Dodaj</button></div>
      <div class="details-list"></div>
    </section>`;
  panel.querySelector('[data-kind="attribute"] .details-list').append(...seed.attributes.map((values) => createDetailRow('attribute', values)));
  panel.querySelector('[data-kind="timer"] .details-list').append(...seed.timers.map((values) => createDetailRow('timer', values)));
  panel.querySelectorAll('.details-list').forEach(updateEmptyDetails);
  tile.append(panel);
  updateAttributeCount(tile);
  synchronizeReferences(tile);
}

document.addEventListener('click', (event) => {
  const toggle = event.target.closest('.toggle-details');
  if (toggle) {
    const tile = toggle.closest('.object-tile');
    const panel = tile.querySelector('.object-details');
    panel.classList.toggle('hidden');
    tile.classList.toggle('details-open', !panel.classList.contains('hidden'));
    toggle.setAttribute('aria-expanded', String(!panel.classList.contains('hidden')));
    return;
  }
  const add = event.target.closest('.add-detail');
  if (add) {
    beginDetailEdit(add.closest('.details-section'));
    return;
  }
  const edit = event.target.closest('.edit-detail');
  if (edit) {
    beginDetailEdit(edit.closest('.details-section'), edit.closest('.detail-row'));
    return;
  }
  const remove = event.target.closest('.remove-detail');
  if (remove) {
    const list = remove.closest('.details-list');
    const tile = remove.closest('.object-tile');
    const row = remove.closest('.detail-row');
    const isAttribute = remove.closest('.details-section').dataset.kind === 'attribute';
    if (isAttribute) {
      const attributeName = row.dataset.name;
      const usedByAction = [...tile.querySelectorAll('[data-trigger-state]')]
        .some((trigger) => trigger.actionItems?.some((action) => {
          if (action.type !== 'setAttribute') return false;
          const expression = normalizeSetExpression(action.args[1]);
          return action.args[0] === attributeName
            || [expression.left, expression.right].some((operand) => operand.kind === 'attribute' && operand.value === attributeName);
        }));
      if (usedByAction) {
        showToast('Nie można usunąć atrybutu, który jest używany');
        return;
      }
    } else {
      const timerName = row.dataset.name;
      const usedByTrigger = [...tile.querySelectorAll('[data-trigger-type="timer"]')]
        .some((trigger) => trigger.dataset.triggerName === timerName);
      const usedByAction = [...tile.querySelectorAll('[data-trigger-state]')]
        .some((trigger) => trigger.actionItems?.some((action) => action.type === 'startTimer' && action.args[0] === timerName));
      if (usedByTrigger || usedByAction) {
        showToast('Nie można usunąć timera, który jest używany');
        return;
      }
    }
    if (!window.confirm('Usunąć tę pozycję?')) return;
    row.remove();
    updateEmptyDetails(list);
    if (isAttribute) updateAttributeCount(tile);
  }
});

function messageNames() {
  return [...document.querySelectorAll('#messagesList .message-row')]
    .map((row) => row.dataset.name)
    .filter(Boolean);
}

function messageAttributes(messageName) {
  const row = [...document.querySelectorAll('#messagesList .message-row')]
    .find((message) => message.dataset.name === messageName);
  return row?.messageAttributes || [];
}

function renderMessageRow(row) {
  row.messageAttributes ||= [];
  row.replaceChildren();
  const icon = document.createElement('i');
  icon.textContent = '✉';
  const name = document.createElement('strong');
  name.textContent = row.dataset.name;
  const controls = document.createElement('span');
  controls.className = 'message-controls';
  controls.innerHTML = '<button class="toggle-message-attributes" type="button" title="Atrybuty">AT</button><button class="edit-message" type="button" title="Edytuj">✎</button><button class="delete-message" type="button" title="Usuń">×</button>';
  row.append(icon, name, controls);
  const attributes = document.createElement('div');
  attributes.className = `message-attributes${row.attributesOpen ? '' : ' hidden'}`;
  attributes.innerHTML = '<div class="message-attributes-head"><span>ATRYBUTY</span><button class="add-message-attribute" type="button">+ Dodaj</button></div><div class="message-attributes-list"></div>';
  const list = attributes.querySelector('.message-attributes-list');
  row.messageAttributes.forEach((attribute, index) => list.append(renderMessageAttributeRow(attribute, index)));
  if (!row.messageAttributes.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-details';
    empty.textContent = 'Brak atrybutów';
    list.append(empty);
  }
  row.append(attributes);
}

function renderMessageAttributeRow(attribute, index) {
  const item = document.createElement('div');
  item.className = 'message-attribute-row';
  item.dataset.attributeIndex = index;
  const icon = document.createElement('i');
  icon.textContent = attribute.type === 'number' ? '#' : attribute.type === 'boolean' ? '◉' : 'Aa';
  const name = document.createElement('strong');
  name.textContent = attribute.name;
  const controls = document.createElement('span');
  controls.className = 'message-controls';
  controls.innerHTML = '<button class="edit-message-attribute" type="button" title="Edytuj">✎</button><button class="delete-message-attribute" type="button" title="Usuń">×</button>';
  item.append(icon, name, controls);
  return item;
}

function synchronizeMessageAttribute(messageName, oldName, newName) {
  document.querySelectorAll('[data-trigger-state]').forEach((trigger) => {
    trigger.actionItems?.forEach((action) => {
      if (action.type !== 'sendMessage' || action.args[0] !== messageName) return;
      const values = action.args[1] || {};
      if (oldName && Object.hasOwn(values, oldName)) {
        if (newName) values[newName] = values[oldName];
        delete values[oldName];
      } else if (newName && !Object.hasOwn(values, newName)) {
        values[newName] = '';
      }
      action.args[1] = values;
    });
    renderTrigger(trigger);
  });
}

function beginMessageAttributeEdit(messageRow, index = null) {
  if (!requestEditAccess()) return;
  const isNew = index === null;
  const original = isNew ? { type: 'string', name: '' } : messageRow.messageAttributes[index];
  const list = messageRow.querySelector('.message-attributes-list');
  list.querySelector('.empty-details')?.remove();
  let row = isNew ? document.createElement('div') : list.querySelector(`[data-attribute-index="${index}"]`);
  if (isNew) {
    row.className = 'message-attribute-row';
    list.append(row);
  }
  const editor = document.createElement('div');
  editor.className = 'message-attribute-editor';
  editor.innerHTML = '<select aria-label="Typ"><option value="string">string</option><option value="number">number</option><option value="boolean">boolean</option></select><input aria-label="Nazwa" placeholder="Nazwa atrybutu"><button class="cancel-message-attribute" type="button">Anuluj</button><button class="save-message-attribute" type="button">Zapisz</button>';
  const type = editor.querySelector('select');
  const name = editor.querySelector('input');
  type.value = original.type;
  name.value = original.name;
  row.replaceChildren(editor);

  editor.querySelector('.save-message-attribute').addEventListener('click', () => {
    const candidate = name.value.trim();
    const duplicate = messageRow.messageAttributes.some((attribute, otherIndex) => otherIndex !== index && attribute.name.toLocaleLowerCase('pl') === candidate.toLocaleLowerCase('pl'));
    if (!candidate || duplicate) {
      name.classList.add('invalid');
      showToast(!candidate ? 'Nazwa atrybutu nie może być pusta' : 'Atrybut o tej nazwie już istnieje');
      return;
    }
    const updated = { type: type.value, name: candidate };
    if (isNew) messageRow.messageAttributes.push(updated);
    else messageRow.messageAttributes[index] = updated;
    synchronizeMessageAttribute(messageRow.dataset.name, isNew ? '' : original.name, updated.name);
    messageRow.attributesOpen = true;
    renderMessageRow(messageRow);
    showToast(`${isNew ? 'Dodano' : 'Zmieniono'} atrybut wiadomości`);
  });
  editor.querySelector('.cancel-message-attribute').addEventListener('click', () => renderMessageRow(messageRow));
  requestAnimationFrame(() => name.focus());
}

function synchronizeMessageReferences(oldName, newName) {
  document.querySelectorAll('[data-trigger-state]').forEach((trigger) => {
    if (trigger.dataset.triggerType === 'message' && trigger.dataset.triggerName === oldName) {
      trigger.dataset.triggerName = newName;
    }
    trigger.actionItems?.forEach((action) => {
      if (action.type === 'sendMessage' && action.args[0] === oldName) action.args[0] = newName;
    });
    trigger.dataset.actions = trigger.actionItems?.map(actionText).join('|') || trigger.dataset.actions;
    renderTrigger(trigger);
  });
}

function beginMessageEdit(row = null) {
  if (!requestEditAccess()) return;
  const isNew = !row;
  const list = document.querySelector('#messagesList');
  if (isNew) {
    row = document.createElement('div');
    row.className = 'message-row';
    list.append(row);
  }
  const oldName = row.dataset.name || '';
  const editor = document.createElement('div');
  editor.className = 'message-editor';
  editor.innerHTML = '<input aria-label="Nazwa wiadomości" placeholder="Nazwa wiadomości"><button class="cancel-message" type="button">Anuluj</button><button class="save-message" type="button">Zapisz</button>';
  const input = editor.querySelector('input');
  input.value = oldName;
  row.replaceChildren(editor);

  function validate(showMessage = true) {
    const candidate = input.value.trim();
    const duplicate = [...list.querySelectorAll('.message-row')].some((other) => (
      other !== row && other.dataset.name?.toLocaleLowerCase('pl') === candidate.toLocaleLowerCase('pl')
    ));
    const error = !candidate ? 'Nazwa wiadomości nie może być pusta'
      : duplicate ? 'Wiadomość o tej nazwie już istnieje' : '';
    input.classList.toggle('invalid', Boolean(error));
    if (error && showMessage) showToast(error);
    return !error;
  }

  editor.querySelector('.save-message').addEventListener('click', () => {
    if (!validate()) return;
    const newName = input.value.trim();
    row.dataset.name = newName;
    renderMessageRow(row);
    if (!isNew && oldName !== newName) synchronizeMessageReferences(oldName, newName);
    showToast(`${isNew ? 'Dodano' : 'Zmieniono'} wiadomość: ${newName}`);
  });
  editor.querySelector('.cancel-message').addEventListener('click', () => {
    if (isNew) row.remove();
    else renderMessageRow(row);
  });
  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
}

function setupMessages() {
  const definitions = [
    ['ZaładujPralkeReq', [
      { type: 'number', name: 'IlośćPrania' },
      { type: 'number', name: 'CzasTrwania' },
      { type: 'string', name: 'KolorPrania' }
    ]],
    ['ZaładujPralkeCfm', [
      { type: 'number', name: 'wagaM' },
      { type: 'string', name: 'info' }
    ]],
    ['ZaładujPralkeRej', []]
  ];
  const list = document.querySelector('#messagesList');
  definitions.forEach(([name, attributes]) => {
    const row = document.createElement('div');
    row.className = 'message-row';
    row.dataset.name = name;
    row.messageAttributes = attributes;
    renderMessageRow(row);
    list.append(row);
  });
  document.querySelectorAll('[data-trigger-state]').forEach((trigger) => {
    trigger.actionItems?.forEach((action) => {
      if (action.type === 'sendMessage' && action.args[0] === 'ZaładujPralkeCfm') {
        action.args[1] = { wagaM: '30', info: 'Udało się' };
      }
      if (action.type === 'sendMessage' && action.args[0] === 'ZaładujPralkeRej') action.args[1] = {};
    });
    renderTrigger(trigger);
  });
}

document.querySelector('#addMessage').addEventListener('click', () => beginMessageEdit());
document.addEventListener('click', (event) => {
  const toggleAttributes = event.target.closest('.toggle-message-attributes');
  if (toggleAttributes) {
    const row = toggleAttributes.closest('.message-row');
    row.attributesOpen = !row.attributesOpen;
    renderMessageRow(row);
    return;
  }
  const addAttribute = event.target.closest('.add-message-attribute');
  if (addAttribute) {
    const row = addAttribute.closest('.message-row');
    row.attributesOpen = true;
    beginMessageAttributeEdit(row);
    return;
  }
  const editAttribute = event.target.closest('.edit-message-attribute');
  if (editAttribute) {
    beginMessageAttributeEdit(editAttribute.closest('.message-row'), Number(editAttribute.closest('.message-attribute-row').dataset.attributeIndex));
    return;
  }
  const deleteAttribute = event.target.closest('.delete-message-attribute');
  if (deleteAttribute) {
    const messageRow = deleteAttribute.closest('.message-row');
    const index = Number(deleteAttribute.closest('.message-attribute-row').dataset.attributeIndex);
    const attribute = messageRow.messageAttributes[index];
    if (!window.confirm(`Usunąć atrybut „${attribute.name}”?`)) return;
    messageRow.messageAttributes.splice(index, 1);
    synchronizeMessageAttribute(messageRow.dataset.name, attribute.name, '');
    messageRow.attributesOpen = true;
    renderMessageRow(messageRow);
    showToast('Usunięto atrybut wiadomości');
    return;
  }
  const edit = event.target.closest('.edit-message');
  if (edit) {
    beginMessageEdit(edit.closest('.message-row'));
    return;
  }
  const remove = event.target.closest('.delete-message');
  if (remove) {
    const row = remove.closest('.message-row');
    const name = row.dataset.name;
    const used = [...document.querySelectorAll('[data-trigger-state]')].some((trigger) => (
      (trigger.dataset.triggerType === 'message' && trigger.dataset.triggerName === name)
      || trigger.actionItems?.some((action) => action.type === 'sendMessage' && action.args[0] === name)
    ));
    if (used) {
      showToast('Nie można usunąć używanej wiadomości');
      return;
    }
    if (!window.confirm(`Usunąć wiadomość „${name}”?`)) return;
    row.remove();
    showToast('Usunięto wiadomość');
  }
});

addState.addEventListener('click', () => {
  if (!messagesCanvas.classList.contains('hidden')) {
    beginMessageEdit();
    return;
  }
  if (!homeCanvas.classList.contains('hidden')) {
    createObject();
    return;
  }
  const tile = [...document.querySelectorAll('.object-tile')]
    .find((object) => object.dataset.object === objectName.textContent);
  if (!tile) return;
  openHome();
  addStateToTile(tile);
});
document.querySelector('#addObject').addEventListener('click', createObject);

function makeDraggable(tile) {
  const canvas = tile.closest('.canvas');
  const storageKey = `kaw-position-${tile.dataset.tileId}`;
  const savedPosition = JSON.parse(localStorage.getItem(storageKey) || 'null');
  let drag = null;
  let moved = false;

  if (savedPosition) {
    tile.style.left = `${savedPosition.x}px`;
    tile.style.top = `${savedPosition.y}px`;
  }

  const dragHandle = tile.classList.contains('object-tile') ? tile.querySelector('.drag-handle') : tile;

  dragHandle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.target.closest('.open-object, .toggle-details, .tile-name-input, .delete-object')) return;
    const tileRect = tile.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvasRect.width / canvas.clientWidth || 1;
    const scaleY = canvasRect.height / canvas.clientHeight || 1;
    drag = {
      pointerId: event.pointerId,
      offsetX: (event.clientX - tileRect.left) / scaleX,
      offsetY: (event.clientY - tileRect.top) / scaleY,
      scaleX,
      scaleY,
      startX: event.clientX,
      startY: event.clientY
    };
    moved = false;
    dragHandle.setPointerCapture(event.pointerId);
    tile.classList.add('dragging');
  });

  dragHandle.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) > 5) moved = true;

    const canvasRect = canvas.getBoundingClientRect();
    const maxX = Math.max(0, canvas.clientWidth - tile.offsetWidth);
    const maxY = Math.max(0, canvas.clientHeight - tile.offsetHeight);
    const pointerX = (event.clientX - canvasRect.left) / drag.scaleX + canvas.scrollLeft;
    const pointerY = (event.clientY - canvasRect.top) / drag.scaleY + canvas.scrollTop;
    const x = Math.max(0, Math.min(maxX, pointerX - drag.offsetX));
    const y = Math.max(0, Math.min(maxY, pointerY - drag.offsetY));
    tile.style.left = `${x}px`;
    tile.style.top = `${y}px`;
  });

  function finishDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    dragHandle.releasePointerCapture(event.pointerId);
    tile.classList.remove('dragging');
    if (moved) {
      localStorage.setItem(storageKey, JSON.stringify({
        x: parseFloat(tile.style.left),
        y: parseFloat(tile.style.top)
      }));
    }
    drag = null;
  }

  dragHandle.addEventListener('pointerup', finishDrag);
  dragHandle.addEventListener('pointercancel', finishDrag);
  tile.addEventListener('click', (event) => {
    if (moved) {
      event.preventDefault();
      event.stopImmediatePropagation();
      moved = false;
    }
  }, true);
}

document.querySelectorAll('.object-tile').forEach(setupObjectDetails);
document.querySelectorAll('.object-tile').forEach(setupStateControls);
document.querySelectorAll('.object-tile').forEach(setupTriggerControls);
setupMessages();
document.querySelectorAll('[data-tile-id]').forEach(makeDraggable);
