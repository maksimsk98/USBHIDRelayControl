import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import styles from './UserPanel.module.css';

const USERS = ['Maxim', 'Bogdan', 'Vladislav', 'Alexander', 'Konstantin'];
const POLL_INTERVAL_MS = 3000;

export default function UserPanel() {
  // Черновик — что пользователь выбрал, но ещё не применил
  const [draftUser, setDraftUser] = useState(null);
  const [draftPower, setDraftPower] = useState(false);

  // Сохранённое состояние — что реально активно на сервере
  const [serverUser, setServerUser] = useState(null);
  const [serverPower, setServerPower] = useState(false);

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [statusError, setStatusError] = useState(false);

  const pollRef = useRef(null);
  const initializedRef = useRef(false);

  const fetchState = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/panel-state');
      setServerUser(data.activeUser);
      setServerPower(data.powerOn);
      // При первой загрузке синхронизируем черновик с сервером
      if (!initializedRef.current) {
        setDraftUser(data.activeUser);
        setDraftPower(data.powerOn);
        initializedRef.current = true;
      }
    } catch {
      // игнорируем ошибки опроса
    }
  }, []);

  useEffect(() => {
    fetchState();
    pollRef.current = setInterval(fetchState, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [fetchState]);

  const handleApply = async () => {
    setSaving(true);
    setStatus('');
    setStatusError(false);
    try {
      const { data } = await axios.post('/api/panel-state', {
        activeUser: draftUser,
        powerOn: draftPower,
      });
      setServerUser(data.activeUser);
      setServerPower(data.powerOn);
      setStatus('Настройки применены');
    } catch {
      setStatus('Ошибка при сохранении');
      setStatusError(true);
    } finally {
      setSaving(false);
    }
  };

  const isDirty = draftUser !== serverUser || draftPower !== serverPower;

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <p className={styles.title}>Панель пользователя</p>

        {/* Радиокнопки пользователей */}
        <div className={styles.userList}>
          {USERS.map((user) => {
            const isActive = user === serverUser;
            const isSelected = user === draftUser;
            return (
              <label
                key={user}
                className={`${styles.userLabel} ${isActive ? styles.active : ''}`}
              >
                <input
                  type="radio"
                  name="user"
                  value={user}
                  checked={isSelected}
                  onChange={() => setDraftUser(user)}
                />
                {user}
                {isActive && (
                  <span className={styles.activeIndicator}>активен</span>
                )}
              </label>
            );
          })}
        </div>

        {/* Тумблер питания */}
        <div className={styles.controls}>
          <label className={styles.powerToggle}>
            <input
              type="checkbox"
              checked={draftPower}
              onChange={(e) => setDraftPower(e.target.checked)}
            />
            <span
              className={`${styles.powerBtn} ${draftPower ? styles.powerBtnOn : ''}`}
              onClick={() => setDraftPower((v) => !v)}
              role="switch"
              aria-checked={draftPower}
              tabIndex={0}
              onKeyDown={(e) => e.key === ' ' && setDraftPower((v) => !v)}
            >
              <span
                className={`${styles.powerBtnKnob} ${draftPower ? styles.powerBtnKnobOn : ''}`}
              />
            </span>
            <span className={`${styles.powerLabel} ${draftPower ? styles.powerLabelOn : ''}`}>
              {draftPower ? 'Включено' : 'Выключено'}
            </span>
          </label>
        </div>

        <button
          className={styles.applyBtn}
          onClick={handleApply}
          disabled={saving || !isDirty}
        >
          {saving ? 'Сохранение…' : 'Применить настройку'}
        </button>

        <span className={`${styles.status} ${statusError ? styles.statusError : ''}`}>
          {status}
        </span>
      </div>
    </div>
  );
}
