import { LoginPage } from './pages/LoginPage';
import { AdminPage } from './pages/AdminPage';
import { ExecutorPage } from './pages/ExecutorPage';
import { SupervisorPage } from './pages/SupervisorPage';
import { User } from './types';

class Router {
  private app: HTMLElement;

  constructor() {
    this.app = document.querySelector('#app')!;
    this.init();
    window.addEventListener('hashchange', () => this.init());
  }

  private init() {
    const hash = window.location.hash.replace('#/', '') || 'login';
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      if (hash !== 'login') {
        window.location.hash = '#/login';
        return;
      }
      new LoginPage(this.app);
      return;
    }

    const user: User = JSON.parse(userStr);

    switch (hash) {
      case 'login':
        window.location.hash = `#/${user.role}`;
        break;
      case 'admin':
        if (user.role !== 'admin') {
          window.location.hash = `#/${user.role}`;
          return;
        }
        new AdminPage(this.app);
        break;
      case 'executor':
        if (user.role !== 'executor') {
          window.location.hash = `#/${user.role}`;
          return;
        }
        new ExecutorPage(this.app);
        break;
      case 'supervisor':
        if (user.role !== 'supervisor') {
          window.location.hash = `#/${user.role}`;
          return;
        }
        new SupervisorPage(this.app);
        break;
      default:
        window.location.hash = `#/${user.role}`;
    }
  }
}

new Router();
