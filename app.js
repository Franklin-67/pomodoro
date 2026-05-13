class PomodoroTimer {
    constructor() {
        this.workDuration = 25;
        this.breakDuration = 5;
        this.longBreakDuration = 15;
        this.sessionsBeforeLongBreak = 4;

        this.timeLeft = this.workDuration * 60;
        this.isRunning = false;
        this.isPaused = false;
        this.timerId = null;

        this.currentSession = 1;
        this.isWorkMode = true;
        this.soundEnabled = true;
        this.notificationEnabled = true;

        this.settings = {};
        this.stats = this.loadStats();

        this.initElements();
        this.bindEvents();
        this.updateDisplay();
        this.updateStats();
        this.requestNotificationPermission();
    }

    initElements() {
        this.timerDisplay = document.getElementById('timer');
        this.modeIndicator = document.getElementById('modeIndicator');
        this.currentSessionDisplay = document.getElementById('currentSession');

        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');

        this.workDurationInput = document.getElementById('workDuration');
        this.breakDurationInput = document.getElementById('breakDuration');
        this.longBreakDurationInput = document.getElementById('longBreakDuration');
        this.sessionsBeforeLongBreakInput = document.getElementById('sessionsBeforeLongBreak');
        this.soundEnabledInput = document.getElementById('soundEnabled');
        this.notificationEnabledInput = document.getElementById('notificationEnabled');
        this.saveSettingsBtn = document.getElementById('saveSettings');

        this.todayPomodorosDisplay = document.getElementById('todayPomodoros');
        this.todayMinutesDisplay = document.getElementById('todayMinutes');
        this.totalSessionsDisplay = document.getElementById('totalSessions');

        this.loadSettings();
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.isRunning && !this.isPaused) {
                    this.pause();
                } else {
                    this.start();
                }
            } else if (e.code === 'KeyR') {
                this.reset();
            }
        });
    }

    start() {
        if (this.isRunning && !this.isPaused) return;

        this.isRunning = true;
        this.isPaused = false;

        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.timerDisplay.classList.add('running');

        this.timerId = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();

            if (this.timeLeft <= 0) {
                this.complete();
            }
        }, 1000);
    }

    pause() {
        if (!this.isRunning) return;

        this.isPaused = true;
        clearInterval(this.timerId);

        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.timerDisplay.classList.remove('running');
    }

    reset() {
        clearInterval(this.timerId);

        this.isRunning = false;
        this.isPaused = false;

        this.timeLeft = this.isWorkMode
            ? this.workDuration * 60
            : this.getBreakDuration() * 60; // 休息时长根据是否为长休息决定

        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.timerDisplay.classList.remove('running');
        this.updateDisplay();
    }

    getBreakDuration() {
        return this.shouldTakeLongBreak(this.currentSession, this.sessionsBeforeLongBreak)
            ? this.longBreakDuration
            : this.breakDuration;
    }

    shouldTakeLongBreak(session, beforeLongBreak) {
        return session % beforeLongBreak === 0; // 每N个番茄后进行长休息
    }

    complete() {
        clearInterval(this.timerId);
        this.isRunning = false;
        this.isPaused = false;
        this.timerDisplay.classList.remove('running');
        this.timerDisplay.classList.add('celebrate');

        setTimeout(() => {
            this.timerDisplay.classList.remove('celebrate');
        }, 500);

        if (this.isWorkMode) {
            this.stats.todayPomodoros++;
            this.stats.todayMinutes += this.workDuration;
            this.stats.totalSessions++;
            this.saveStats();
            this.updateStats();
        }

        this.playSound();
        this.showNotification();

        this.switchMode();
    }

    switchMode() {
        if (this.isWorkMode) {
            this.isWorkMode = false;
            this.timeLeft = this.getBreakDuration() * 60;
            this.modeIndicator.textContent = this.shouldTakeLongBreak(this.currentSession, this.sessionsBeforeLongBreak)
                ? '长休息时间'
                : '休息时间';
            this.timerDisplay.className = this.shouldTakeLongBreak(this.currentSession, this.sessionsBeforeLongBreak)
                ? 'timer long-break-mode'
                : 'timer break-mode';
        } else {
            this.isWorkMode = true;
            this.currentSession++;
            this.timeLeft = this.workDuration * 60;
            this.modeIndicator.textContent = '工作时间';
            this.timerDisplay.className = 'timer work-mode';
            this.currentSessionDisplay.textContent = this.currentSession;
        }

        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.updateDisplay();
    }

    updateDisplay() {
        this.timerDisplay.textContent = this.formatTime(this.timeLeft);
        document.title = `${this.timerDisplay.textContent} - 番茄钟`;
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    updateStats() {
        this.todayPomodorosDisplay.textContent = this.stats.todayPomodoros;
        this.todayMinutesDisplay.textContent = this.stats.todayMinutes;
        this.totalSessionsDisplay.textContent = this.stats.totalSessions;
    }

    playSound() {
        if (!this.soundEnabled) return;

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);

        setTimeout(() => {
            const osc2 = audioContext.createOscillator();
            const gain2 = audioContext.createGain();
            osc2.connect(gain2);
            gain2.connect(audioContext.destination);
            osc2.frequency.value = 1000;
            osc2.type = 'sine';
            gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            osc2.start(audioContext.currentTime);
            osc2.stop(audioContext.currentTime + 0.5);
        }, 200);
    }

    async requestNotificationPermission() {
        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    }

    showNotification() {
        if (!this.notificationEnabled || !this.hasNotificationPermission()) return;

        const title = this.isWorkMode ? '休息时间到了！' : '工作时间到了！';
        const body = this.isWorkMode
            ? '休息一下吧，放松一下眼睛。'
            : '休息结束，准备开始新的番茄钟！';

        new Notification(title, {
            body: body,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🍅</text></svg>',
            tag: 'pomodoro-timer'
        });
    }

    hasNotificationPermission() {
        return 'Notification' in window && Notification.permission === 'granted';
    }

    saveSettings() {
        const workDuration = this.workDurationInput
            ? parseInt(this.workDurationInput.value) || 25
            : 25;
        const breakDuration = this.breakDurationInput
            ? parseInt(this.breakDurationInput.value) || 5
            : 5;
        const longBreakDuration = this.longBreakDurationInput
            ? parseInt(this.longBreakDurationInput.value) || 15
            : 15;
        const sessionsBeforeLongBreak = this.sessionsBeforeLongBreakInput
            ? parseInt(this.sessionsBeforeLongBreakInput.value) || 4
            : 4;
        const soundEnabled = this.soundEnabledInput
            ? this.soundEnabledInput.checked
            : true;
        const notificationEnabled = this.notificationEnabledInput
            ? this.notificationEnabledInput.checked
            : true;

        this.workDuration = workDuration;
        this.breakDuration = breakDuration;
        this.longBreakDuration = longBreakDuration;
        this.sessionsBeforeLongBreak = sessionsBeforeLongBreak;
        this.soundEnabled = soundEnabled;
        this.notificationEnabled = notificationEnabled;

        localStorage.setItem('pomodoroSettings', JSON.stringify({
            workDuration: this.workDuration,
            breakDuration: this.breakDuration,
            longBreakDuration: this.longBreakDuration,
            sessionsBeforeLongBreak: this.sessionsBeforeLongBreak,
            soundEnabled: this.soundEnabled,
            notificationEnabled: this.notificationEnabled
        }));

        if (!this.isRunning) {
            this.timeLeft = this.workDuration * 60;
            this.updateDisplay();
        }

        alert('设置已保存！');
    }

    loadSettings() {
        const defaults = {
            workDuration: 25,
            breakDuration: 5,
            longBreakDuration: 15,
            sessionsBeforeLongBreak: 4,
            soundEnabled: true,
            notificationEnabled: true
        };

        const saved = localStorage.getItem('pomodoroSettings');
        if (!saved) {
            this.settings = { ...defaults };
            this.applySettings(this.settings);
            return this.settings;
        }

        const settings = JSON.parse(saved);
        this.settings = { ...defaults, ...settings };
        this.applySettings(this.settings);
        return this.settings;
    }

    applySettings(settings) {
        this.workDuration = settings.workDuration;
        this.breakDuration = settings.breakDuration;
        this.longBreakDuration = settings.longBreakDuration;
        this.sessionsBeforeLongBreak = settings.sessionsBeforeLongBreak;
        this.soundEnabled = settings.soundEnabled;
        this.notificationEnabled = settings.notificationEnabled;

        if (this.workDurationInput) {
            this.workDurationInput.value = this.workDuration;
            this.breakDurationInput.value = this.breakDuration;
            this.longBreakDurationInput.value = this.longBreakDuration;
            this.sessionsBeforeLongBreakInput.value = this.sessionsBeforeLongBreak;
            this.soundEnabledInput.checked = this.soundEnabled;
            this.notificationEnabledInput.checked = this.notificationEnabled;
        }
    }

    saveStats() {
        const stats = {
            date: new Date().toDateString(),
            todayPomodoros: this.stats.todayPomodoros,
            todayMinutes: this.stats.todayMinutes,
            totalSessions: this.stats.totalSessions
        };
        localStorage.setItem('pomodoroStats', JSON.stringify(stats));
    }

    loadStats() {
        const saved = localStorage.getItem('pomodoroStats');
        if (!saved) {
            return { todayPomodoros: 0, todayMinutes: 0, totalSessions: 0 };
        }

        const stats = JSON.parse(saved);
        const today = new Date().toDateString();

        return stats.date === today
            ? {
                todayPomodoros: stats.todayPomodoros || 0,
                todayMinutes: stats.todayMinutes || 0,
                totalSessions: stats.totalSessions || 0
            }
            : { todayPomodoros: 0, todayMinutes: 0, totalSessions: 0 };
    }
}

const pomodoroTimer = new PomodoroTimer();
