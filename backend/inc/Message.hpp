#include <string>
#include <vector>
#include <map>

#include "backend/inc/AttributesData.hpp"

class Message{
    public:
        enum class AttributeType {
            INT,
            DOUBLE,
            STRING,
            BOOL
        };
        using oneMessageAttributes = std::map<std::string, AttributeType>;
    private:
        Message() = delete;
        static std::map<std::string, oneMessageAttributes> messagesList;
    public:
        static void addMessage(const std::string& messageName, const oneMessageAttributes& attributes);
        static void removeMessage(const std::string& messageName);
        static oneMessageAttributes getMessage(const std::string& messageName);
        static void encodeMessage(const std::string& messageName, AttributesData attributes);
        static void addAttributeToMessage(const std::string& messageName, const std::string& attributeName, AttributeType type);
        static void removeAttributeFromMessage(const std::string& messageName, const std::string& attributeName);
};