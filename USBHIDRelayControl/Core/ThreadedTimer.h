#pragma once
// ThreadedTimer.h
#pragma once

#include <atomic>
#include <chrono>
#include <condition_variable>
#include <functional>
#include <mutex>
#include <thread>

/**
 * @class ThreadedTimer
 * @brief Запускает заданный коллбэк периодически в отдельном потоке.
 *
 * Класс создает фоновый поток, который вызывает пользовательский
 * коллбэк с заданным интервалом времени. Поток автоматически
 * останавливается при уничтожении объекта.
 */
class ThreadedTimer
{
public:
	/// Тип функции-коллбэка.
	using Callback = std::function<void()>;

	/// Тип часов, используемый для расчёта интервала.
	using Clock = std::chrono::steady_clock;

	/**
	 * @brief Конструктор.
	 * @param cb Функция, которая будет вызвана по таймеру.
	 * @param interval Интервал между вызовами коллбэка.
	 */
	ThreadedTimer(
		const Callback& cb,
		Clock::duration interval
	);

	/**
	 * @brief Деструктор. Автоматически останавливает таймер.
	 */
	~ThreadedTimer();

	/**
	 * @brief Запускает таймер. Ничего не делает, если уже запущен.
	 */
	void start();

	/**
	 * @brief Останавливает таймер и ожидает завершения фонового потока.
	 */
	void stop();

	/**
	 * @brief Проверяет, запущен ли таймер.
	 * @return true, если таймер активен.
	 */
	bool isRunning() const;

	/**
	 * @brief Изменяет интервал между вызовами.
	 * @param interval Новый интервал.
	 */
	void setInterval(Clock::duration interval);

	// Запрещаем копирование
	ThreadedTimer(const ThreadedTimer&) = delete;
	ThreadedTimer& operator=(const ThreadedTimer&) = delete;

private:
	/**
	 * @brief Основной цикл фонового потока.
	 */
	void threadLoop();

private:
	Callback                m_callback;    /**< Функция-коллбэк. */
	Clock::duration         m_interval;    /**< Интервал между вызовами. */
	std::atomic<bool>       m_running;     /**< Флаг работы таймера. */
	std::thread             m_worker;      /**< Фоновый поток. */
	std::mutex              m_mutex;       /**< Защищает доступ к m_interval. */
	std::condition_variable m_cv;          /**< Уведомляет о смене флага или интервала. */
	mutable std::mutex      m_workerMutex; /**< Защищает доступ к m_worker. */
};
