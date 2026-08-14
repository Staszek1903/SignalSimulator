const runButton = document.querySelector('#runButton');
const status = document.querySelector('#status');
const stateName = document.querySelector('#stateName');
const stateDescription = document.querySelector('#stateDescription');
const objectName = document.querySelector('#objectName');
const toast = document.querySelector('#toast');

let running = false;
let selectedState = document.querySelector('.state.active');

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('visible'), 1500);
}

runButton.addEventListener('click', () => {
  running = !running;
  runButton.textContent = running ? 'Ⅱ Zatrzymaj' : '▶ Uruchom';
  status.innerHTML = `<i></i> Symulacja ${running ? 'uruchomiona' : 'zatrzymana'}`;
  status.parentElement.classList.toggle('running', running);
});

document.querySelectorAll('.state').forEach((state) => {
  state.addEventListener('click', () => {
    selectedState.classList.remove('active');
    selectedState = state;
    selectedState.classList.add('active');
    stateName.value = state.dataset.state;
    stateDescription.value = state.dataset.description;
  });
});

stateName.addEventListener('input', () => {
  selectedState.dataset.state = stateName.value;
  selectedState.querySelector('strong').textContent = stateName.value.toUpperCase();
});

stateDescription.addEventListener('input', () => {
  selectedState.dataset.description = stateDescription.value;
  selectedState.querySelector('small').textContent = stateDescription.value;
});

document.querySelectorAll('.object').forEach((object) => {
  object.addEventListener('click', () => {
    document.querySelector('.object.active').classList.remove('active');
    object.classList.add('active');
    objectName.textContent = object.dataset.object;
    showToast(`Wybrano obiekt: ${object.dataset.object}`);
  });
});

document.querySelector('#addState').addEventListener('click', () => showToast('Następny krok: formularz dodawania stanu'));
document.querySelector('#addObject').addEventListener('click', () => showToast('Następny krok: formularz dodawania obiektu'));
document.querySelector('#addAction').addEventListener('click', () => showToast('Następny krok: formularz dodawania akcji'));
