#pragma once
// BaseAMQP.h
#pragma once

#include <SimpleAmqpClient/SimpleAmqpClient.h>
//#include "Service.h"
#include "../Core/ThreadedTimer.h"

#include <algorithm> // std::replaces
#include <cassert>
#include <chrono>
#include <cstdint>
#include <filesystem>
#include <format>
#include "iconv/win/iconv.h"
#include <iostream>
#include <map>
#include <nlohmann/json.hpp>
#include <regex>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <vector>

/**
 * @class BaseAMQP
 * @brief Абстрактный клиент RabbitMQ с таймерным опросом.
 *
 * Хранит канал, имена очередей, тег потребителя и
 * запускает OnSoftTimerEvent() через заданный интервал.
 */
class BaseAMQP
{
public:
	/**
	 * @brief Конструктор.
	 * @param interval       Интервал между вызовами OnSoftTimerEvent().
	 * @param channel        Готовый AMQP-канал.
	 * @param queueName      Имя очереди для чтения.
	 * @param respQueueName  Имя очереди для ответов.
	 */
	BaseAMQP(
		std::chrono::milliseconds  interval,
		AmqpClient::Channel::ptr_t channel,
		const std::string& chromaName,
		const std::string& setOpName,
		const std::string& respOpName
	);

	/** @brief Деструктор. Останавливает таймер и закрывает канал. */
	virtual ~BaseAMQP();

	/** @brief Запустить опрос по таймеру. */
	void StartSoftTimerThread();

	/** @brief Остановить опрос по таймеру. */
	void StopSoftTimerThread();

	/**
	 * @brief Обработчик события таймера.
	 * Вызывается в дочерних классах.
	 */
	virtual void OnSoftTimerEvent() = 0;

	/** @name Доступ к параметрам */
	///@{
	std::string GetQueueName() const;
	std::string GetRespQueueName() const;
	std::string GetConsumerTag() const;
	void        SetQueueName(const std::string& name);
	void        SetRespQueueName(const std::string& name);
	void        SetConsumerTag(const std::string& tag);
	///@}
	virtual AmqpClient::Channel::ptr_t& getChannel()
	{
		return m_channel;
	};
	/*virtual std::shared_ptr<spdlog::logger> releaseLogger()
	{
		return nullptr;
	};*/

protected:
	AmqpClient::Channel::ptr_t m_channel;         /**< канал RabbitMQ */
	ThreadedTimer              m_timer;           /**< Таймер опроса. */
	std::string                m_queue_name;      /**< Очередь для чтения. */
	std::string                m_resp_queue_name; /**< Очередь для ответов. */
	std::string                m_consumer_tag;    /**< Текущий consumer_tag. */
	std::mutex                 m_requestMutex;
};
