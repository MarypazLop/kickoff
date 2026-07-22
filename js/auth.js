/**
 * auth.js — pantalla de autenticación (login / registro)
 */
import { login, register, setSession } from './api.js';

const authScreen = document.getElementById('auth-screen');
const appEl = document.getElementById('app');
const errorBox = document.getElementById('auth-error');

const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.add('show');
}
function clearError() {
  errorBox.classList.remove('show');
}

tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  formLogin.classList.remove('hidden');
  formRegister.classList.add('hidden');
  clearError();
});
tabRegister.addEventListener('click', () => {
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  formRegister.classList.remove('hidden');
  formLogin.classList.add('hidden');
  clearError();
});

export function onAuthSuccess(callback) {
  authSuccessCallback = callback;
}
let authSuccessCallback = () => {};

function enterApp(user) {
  authScreen.classList.add('hidden');
  appEl.classList.add('active');
  document.getElementById('user-name').textContent = user?.name || 'Estudiante';
  authSuccessCallback();
}

formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  const submitBtn = formLogin.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Ingresando…';
  try {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const result = await login(email, password);
    setSession(result.token, result.user);
    enterApp(result.user);
  } catch (err) {
    showError(err.message || 'No se pudo iniciar sesión. Verifica tus credenciales.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Ingresar';
  }
});

formRegister.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  const submitBtn = formRegister.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creando cuenta…';
  try {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const result = await register(name, email, password);
    setSession(result.token, result.user);
    enterApp(result.user);
  } catch (err) {
    showError(err.message || 'No se pudo crear la cuenta.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Crear cuenta';
  }
});

export function tryAutoLogin() {
  // Si ya hay token guardado, entra directo (el 401 en la primera llamada
  // real disparará el modal de sesión expirada si el token ya no sirve).
  const token = localStorage.getItem('wc2026_token');
  if (!token) return false;
  const rawUser = localStorage.getItem('wc2026_user');
  const user = rawUser ? JSON.parse(rawUser) : null;
  enterApp(user);
  return true;
}
