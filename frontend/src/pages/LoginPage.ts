import { authApi } from '../services/api';
import { User } from '../types';
import { showToast } from '../utils';

export class LoginPage {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.bindEvents();
  }

  private render() {
    this.container.innerHTML = `
      <div class="login-container">
        <div class="login-box">
          <h2>施工隐患管理系统</h2>
          <div class="form-item">
            <label>用户名</label>
            <input type="text" id="username" placeholder="请输入用户名" />
          </div>
          <div class="form-item">
            <label>密码</label>
            <input type="password" id="password" placeholder="请输入密码" />
          </div>
          <button class="btn btn-primary" id="loginBtn">登 录</button>
          <div style="margin-top: 20px; font-size: 12px; color: #999; text-align: center;">
            <div>测试账号：</div>
            <div>管理员：admin / admin123</div>
            <div>执行人：executor / exec123</div>
            <div>监督人：supervisor / super123</div>
          </div>
        </div>
      </div>
    `;
  }

  private bindEvents() {
    const loginBtn = this.container.querySelector('#loginBtn')!;
    const usernameInput = this.container.querySelector('#username') as HTMLInputElement;
    const passwordInput = this.container.querySelector('#password') as HTMLInputElement;

    const handleLogin = async () => {
      const username = usernameInput.value.trim();
      const password = passwordInput.value.trim();

      if (!username || !password) {
        showToast('请输入用户名和密码', 'error');
        return;
      }

      try {
        const result = await authApi.login(username, password);
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        showToast('登录成功');
        
        const role = result.user.role;
        if (role === 'admin') {
          window.location.hash = '#/admin';
        } else if (role === 'executor') {
          window.location.hash = '#/executor';
        } else {
          window.location.hash = '#/supervisor';
        }
      } catch (err: any) {
        showToast(err.message || '登录失败', 'error');
      }
    };

    loginBtn.addEventListener('click', handleLogin);
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
  }
}
