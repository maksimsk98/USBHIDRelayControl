import { useMemo, useState, useEffect } from 'react';
import { axiosSession } from '../services/axiosConfig';

// Глобальный кэш прав доступа
let permissionsCache = null;
let permissionsCachePromise = null;

// Глобальный флаг режима тестирования
let isTestingMode = false;

/**
 * Устанавливает режим тестирования (все права разрешены)
 * @param {boolean} value
 */
export const setTestingMode = (value) => {
  isTestingMode = !!value;
};

/**
 * Проверяет, включен ли режим тестирования
 * @returns {boolean}
 */
export const getTestingMode = () => isTestingMode;

/**
 * Получает права доступа из API и кэширует их
 * @returns {Promise<Record<string, boolean>>}
 */
const fetchPermissions = async () => {
  // Если уже есть кэш, возвращаем его
  if (permissionsCache) {
    return permissionsCache;
  }

  // Если уже выполняется запрос, ждем его
  if (permissionsCachePromise) {
    return permissionsCachePromise;
  }

  // Создаем новый запрос
  permissionsCachePromise = (async () => {
    try {
      const response = await axiosSession.get('/api/role/current');
      const data = response.data;

      // Построить плоский список прав из дерева
      const flattenPermissions = (node, result = {}) => {
        if (!node) return result;

        // eslint-disable-next-line no-param-reassign
        if (node.path) {
          // eslint-disable-next-line no-param-reassign
          result[node.path] = node.enabled === true;
        }

        if (node.children && Array.isArray(node.children)) {
          node.children.forEach((child) => {
            flattenPermissions(child, result);
          });
        }

        return result;
      };

      const flat = flattenPermissions(data.permissions || null);
      permissionsCache = flat;
      return flat;
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      permissionsCache = {};
      return {};
    } finally {
      permissionsCachePromise = null;
    }
  })();

  return permissionsCachePromise;
};

/**
 * Очищает кэш прав (для тестирования или обновления)
 */
export const clearPermissionsCache = () => {
  permissionsCache = null;
  permissionsCachePromise = null;
};

/**
 * Маппинг требований ТЗ на права доступа CFR
 * ТЗ смотреть в описании задачи PEW-1483 в самом низу.
 */
const PERMISSIONS_DICT = {
  // Действия с градуировками (все используют корневое право "Градуировки")
  copyCalibration: 'main_wnd.calibration',
  deleteCalibration: 'main_wnd.calibration',
  deleteCalibrationLevel: 'main_wnd.calibration',
  deleteCalibrationComponent: 'main_wnd.calibration',
  createCalibration: 'main_wnd.calibration',
  addCalibrationLevel: 'main_wnd.calibration',
  recalibrate: 'main_wnd.calibration',

  // Доступ к меню диагностики
  diagnosticsMenu: 'main_wnd',

  // Управление методами
  deleteMethod: 'main_wnd.calibration',
  createMethod: 'main_wnd.calibration',
};

/**
 * React hook для проверки прав доступа
 * @returns {Object} Объект с функциями для проверки прав и флагом загрузки
 */
export const usePermissions = () => {
  const [permissions, setPermissions] = useState(permissionsCache || {});
  const [isLoading, setIsLoading] = useState(!permissionsCache);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (permissionsCache) {
      setPermissions(permissionsCache);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchPermissions().then((perms) => {
      setPermissions(perms);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    // Проверяем начальное значение
    if (window.electronAPI && typeof window.electronAPI.getTestingMode === 'function') {
      const initialValue = window.electronAPI.getTestingMode();
      setIsTesting(initialValue);
      setTestingMode(initialValue);
    }

    let unsubscribe;

    if (window.electronAPI?.onTestingMode) {
      unsubscribe = window.electronAPI.onTestingMode((value) => {
        setIsTesting(value);
        setTestingMode(value);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return useMemo(() => {
    /**
     * Проверяет, имеет ли пользователь право на указанный путь доступа
     * @param {string} path Путь доступа CFR (например, "main_wnd.calibration")
     * @returns {boolean}
     */
    const hasPermission = (path) => {
      // В режиме тестирования все права разрешены
      if (isTesting || isTestingMode) {
        return true;
      }

      if (!path || typeof path !== 'string') {
        return false;
      }

      // Fail-safe: если права еще не загружены или путь не найден, возвращаем false
      if (!permissions || Object.keys(permissions).length === 0) {
        return false;
      }

      return permissions[path] === true;
    };

    /**
     * Проверяет, имеет ли пользователь право на указанное действие из ТЗ
     * @param {string} actionKey Ключ действия из PERMISSIONS_DICT
     * @returns {boolean}
     */
    const hasPermissionForAction = (actionKey) => {
      const requiredPath = PERMISSIONS_DICT[actionKey];
      if (!requiredPath) {
        console.warn(`Unknown action key: ${actionKey}`);
        return false;
      }
      return hasPermission(requiredPath);
    };

    // Функции для проверки конкретных действий (для удобства использования)
    const hasCalibrationRights = () => hasPermission('main_wnd.calibration');
    const hasDiagnosticsAccess = () => hasPermission('main_wnd');

    return {
      hasPermission,
      hasPermissionForAction,
      hasCalibrationRights,
      hasDiagnosticsAccess,
      isLoading,
      isTesting,
    };
  }, [permissions, isTesting]);
};
