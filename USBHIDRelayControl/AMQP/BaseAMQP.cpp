// BaseAMQP.cpp
#include "BaseAMQP.h"

BaseAMQP::BaseAMQP(
	std::chrono::milliseconds  interval,
	AmqpClient::Channel::ptr_t channel,
	const std::string& chromaName,
	const std::string& setOpName,
	const std::string& respOpName
)
	: m_channel(std::move(channel))
	, m_timer(
		ThreadedTimer::Callback([this]() { OnSoftTimerEvent(); }),
		interval
	)
{
	// Формируем полные имена очередей
	m_queue_name = chromaName.empty() ? setOpName : setOpName + "_" + chromaName;
	m_resp_queue_name = chromaName.empty() ? respOpName : respOpName + "_" + chromaName;
}

BaseAMQP::~BaseAMQP()
{
	StopSoftTimerThread();
}

void BaseAMQP::StartSoftTimerThread()
{
	m_timer.start();
}

void BaseAMQP::StopSoftTimerThread()
{
	m_timer.stop();
}

std::string BaseAMQP::GetQueueName() const
{
	return m_queue_name;
}

std::string BaseAMQP::GetRespQueueName() const
{
	return m_resp_queue_name;
}

std::string BaseAMQP::GetConsumerTag() const
{
	return m_consumer_tag;
}

void BaseAMQP::SetQueueName(const std::string& name)
{
	m_queue_name = name;
}

void BaseAMQP::SetRespQueueName(const std::string& name)
{
	m_resp_queue_name = name;
}

void BaseAMQP::SetConsumerTag(const std::string& tag)
{
	m_consumer_tag = tag;
}
