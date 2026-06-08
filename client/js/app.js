'use strict';

const App = {
  currentScenario: null,
  messages: [],
  timerInterval: null,
  secondsElapsed: 0,
  sessionStartTime: null,

  // --- DOM refs ---
  $: id => document.getElementById(id),

  init() {
    this.checkAuth();
    this.bindEvents();
  },

  async checkAuth() {
    const res = await fetch('/api/auth/check');
    const data = await res.json();
    if (data.authenticated) {
      this.showMain();
    } else {
      this.showLogin();
    }
  },

  bindEvents() {
    // Login
    this.$('login-btn').addEventListener('click', () => this.login());
    this.$('password-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') this.login();
    });

    // Logout
    this.$('logout-btn').addEventListener('click', () => this.logout());

    // Nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchView(btn.dataset.view));
    });

    // Chat controls
    this.$('back-btn').addEventListener('click', () => this.backToScenarios());
    this.$('end-session-btn').addEventListener('click', () => this.requestFeedback());
    this.$('send-btn').addEventListener('click', () => this.sendMessage());
    this.$('user-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
  },

  async login() {
    const pw = this.$('password-input').value;
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    });
    if (res.ok) {
      this.showMain();
    } else {
      this.$('login-error').textContent = 'Wrong password.';
    }
  },

  async logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    this.showLogin();
  },

  showLogin() {
    this.$('login-screen').classList.remove('hidden');
    this.$('main-screen').classList.add('hidden');
  },

  showMain() {
    this.$('login-screen').classList.add('hidden');
    this.$('main-screen').classList.remove('hidden');
    this.loadScenarios();
  },

  switchView(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    this.$(`view-${view}`).classList.remove('hidden');
    document.querySelector(`.nav-btn[data-view="${view}"]`).classList.add('active');
    if (view === 'history') this.loadHistory();
  },

  async loadScenarios() {
    const res = await fetch('/api/chat/scenarios');
    const scenarios = await res.json();
    const container = this.$('scenario-cards');
    container.innerHTML = '';
    scenarios.forEach(s => {
      const card = document.createElement('div');
      card.className = 'scenario-card';
      card.innerHTML = `
        <span class="scenario-icon">${s.icon}</span>
        <div class="scenario-name">${s.label}</div>
        <div class="scenario-desc">${s.description}</div>
      `;
      card.addEventListener('click', () => this.startSession(s));
      container.appendChild(card);
    });
  },

  startSession(scenario) {
    this.currentScenario = scenario;
    this.messages = [];
    this.secondsElapsed = 0;
    this.sessionStartTime = Date.now();

    this.$('scenario-label').textContent = scenario.label;
    this.$('messages').innerHTML = '';
    this.$('user-input').value = '';

    this.$('scenario-select').classList.add('hidden');
    this.$('chat-area').classList.remove('hidden');

    this.startTimer();
    this.getAssistantOpening();
  },

  startTimer() {
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.secondsElapsed++;
      const m = String(Math.floor(this.secondsElapsed / 60)).padStart(2, '0');
      const s = String(this.secondsElapsed % 60).padStart(2, '0');
      this.$('session-timer').textContent = `${m}:${s}`;
    }, 1000);
  },

  async getAssistantOpening() {
    this.showTyping();
    const reply = await this.callAPI([]);
    this.hideTyping();
    if (!reply) return;

    this.messages.push({ role: 'user', content: '[Session started]' });
    this.messages.push({ role: 'assistant', content: reply });
    this.renderMessage('assistant', reply);
  },

  async sendMessage() {
    const input = this.$('user-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    this.$('send-btn').disabled = true;

    this.messages.push({ role: 'user', content: text });
    this.renderMessage('user', text);

    if (text.toLowerCase() === 'feedback') {
      await this.requestFeedback();
      this.$('send-btn').disabled = false;
      return;
    }

    this.showTyping();
    const reply = await this.callAPI(this.messages);
    this.hideTyping();

    if (reply) {
      this.messages.push({ role: 'assistant', content: reply });
      this.renderMessage('assistant', reply);
    }

    this.$('send-btn').disabled = false;
    input.focus();
  },

  async requestFeedback() {
    clearInterval(this.timerInterval);

    const feedbackMessages = [
      ...this.messages,
      { role: 'user', content: 'feedback' }
    ];

    this.showTyping();
    const feedback = await this.callAPI(feedbackMessages);
    this.hideTyping();

    if (feedback) {
      this.renderMessage('assistant', feedback, 'feedback');
      await this.saveSession(feedback);
    }

    this.$('end-session-btn').disabled = true;
    this.$('end-session-btn').textContent = 'Session saved ✓';
  },

  async callAPI(messages) {
    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: this.currentScenario.id,
          messages: messages.length ? messages : [{ role: 'user', content: 'Begin the session.' }]
        })
      });
      const data = await res.json();
      return data.reply || null;
    } catch (err) {
      console.error('API error:', err);
      return null;
    }
  },

  async saveSession(feedback) {
    await fetch('/api/sessions/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario: this.currentScenario.id,
        messages: this.messages,
        feedback,
        duration_seconds: this.secondsElapsed
      })
    });
  },

  renderMessage(role, text, extraClass = '') {
    const container = this.$('messages');
    const div = document.createElement('div');
    div.className = `message ${role} ${extraClass}`.trim();

    const roleLabel = role === 'user' ? 'You' : this.currentScenario?.label || 'Assistant';
    div.innerHTML = `
      <div class="message-role">${roleLabel}</div>
      <div class="message-bubble">${this.formatText(text)}</div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  formatText(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  },

  showTyping() {
    const container = this.$('messages');
    const div = document.createElement('div');
    div.className = 'message assistant typing-indicator';
    div.id = 'typing';
    div.innerHTML = `
      <div class="message-role">${this.currentScenario?.label || 'Assistant'}</div>
      <div class="message-bubble">typing...</div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  hideTyping() {
    const el = this.$('typing');
    if (el) el.remove();
  },

  backToScenarios() {
    clearInterval(this.timerInterval);
    this.$('chat-area').classList.add('hidden');
    this.$('scenario-select').classList.remove('hidden');
    this.$('end-session-btn').disabled = false;
    this.$('end-session-btn').textContent = 'End & Get Feedback';
    this.currentScenario = null;
    this.messages = [];
  },

  async loadHistory() {
    const res = await fetch('/api/sessions/history');
    const sessions = await res.json();
    const list = this.$('history-list');

    if (!sessions.length) {
      list.innerHTML = '<p class="history-empty">No sessions yet. Start practicing!</p>';
      return;
    }

    list.innerHTML = '';
    sessions.forEach(s => {
      const date = new Date(s.created_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const duration = s.duration_seconds
        ? `${Math.floor(s.duration_seconds / 60)}m ${s.duration_seconds % 60}s`
        : '—';

      const labels = { interview: '🎯 Interview', stakeholder: '📊 Stakeholder', technical: '⚙️ Tech Team' };
      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `
        <div class="history-meta">
          <div class="history-scenario">${labels[s.scenario] || s.scenario}</div>
          <div class="history-date">${date}</div>
          <div class="history-stats">${s.message_count} messages · ${duration}</div>
        </div>
        <span style="color: var(--text-3); font-size: 18px;">→</span>
      `;
      list.appendChild(item);
    });
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
