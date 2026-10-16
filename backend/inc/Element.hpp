#include "backend/inc/State.hpp"
#include <functional>
#include <string>

class Element {
    public:
    void runTrigger(std::string trigger);
    void addAction(std::string trigger, std::string action);
    void addTrigger(std::string trigger, std::string startAction);
    private:
    enum class ActionType {
        INVALID,
        SEND_MESSAGE,
        ASSOCIATE,
        CHANGE_STATE
    };

    static ActionType actionTypeFromString(const std::string& action);

    int actualState{0};
    std::vector<State> statesList;
};