// ThreadedTimer.cpp
#include "ThreadedTimer.h"

ThreadedTimer::ThreadedTimer(
	const Callback& cb,
	Clock::duration interval
)
	: m_callback(cb)
	, m_interval(interval)
	, m_running(false)
{
}

ThreadedTimer::~ThreadedTimer()
{
	stop();
}

void ThreadedTimer::start()
{
	bool expected = false;
	if (!m_running.compare_exchange_strong(expected, true))
	{
		return;
	}

	std::lock_guard lock(m_workerMutex);
	m_worker = std::thread(&ThreadedTimer::threadLoop, this);
}

void ThreadedTimer::stop()
{
	// Атомарно устанавливаем m_running в false
	m_running.exchange(false);
	m_cv.notify_all();

	std::lock_guard lock(m_workerMutex);

	// Если поток не может войти в основной, то нет смысла его присоединять
	if (!m_worker.joinable())
	{
		//LOG_DEBUG("Early return from ThreadedTimer::stop !m_worker.joinable()");
		return;
	}

	// Если вызывается из потока-работника, не отсоединяем его, т.к. это может привести к тому, что
	// таймер остановится из-за его собственного колбека, а позже другой поток (например чекер IPC)
	// снова вызовет stop(), и вернется без присоединения к основному оптоку, в то время как его владельцы
	// CGChromatograph, BaseAMQP уничтожаются, и это приведет к ошибке, поэтому нужно оставить его joinable,
	// чтобы другой поток мог безопасно присоединиться.
	if (std::this_thread::get_id() == m_worker.get_id())
	{
		//LOG_DEBUG("Early return from ThreadedTimer::stop std::this_thread::get_id() == m_worker.get_id()");
		return;
	}
	m_worker.join();
}

bool ThreadedTimer::isRunning() const
{
	return m_running.load();
}

void ThreadedTimer::setInterval(Clock::duration interval)
{
	{
		std::lock_guard<std::mutex> lock(m_mutex);
		m_interval = interval;
	}
	m_cv.notify_all();
}

void ThreadedTimer::threadLoop()
{
	try
	{
		auto                         nextTick = Clock::now() + m_interval;
		std::unique_lock<std::mutex> lock(m_mutex);

		while (m_running.load())
		{
			// Ждём до следующего тика или пока не вызовут stop()
			if (m_cv.wait_until(lock, nextTick, [this] { return !m_running.load(); }))
			{
				break;
			}

			// Вызываем пользовательский коллбэк
			m_callback();

			// Рассчитываем время следующего тика
			nextTick += m_interval;
		}
	}
	catch (const std::exception& e)
	{
		const std::string msg =
			std::format("Exception occured while running timer: {}", e.what());
		/*LoggerManager::getErrorLogger()->error(msg);
		LoggerManager::getErrorLogger()->flush();*/
	}
	catch (...)
	{
		/*const std::string msg =
			fmt::format("[{}] Unknown exception occured while running timer", PEAK_EXPERT_WEB_FUNCTION_NAME);
		LoggerManager::getErrorLogger()->error(msg);
		LoggerManager::getErrorLogger()->flush();*/
	}
}
