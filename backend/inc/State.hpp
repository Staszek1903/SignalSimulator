#include <functional>
#include <map>
#include <string>
#include <vector>

class State{
    public:
    using Action = std::function<void()>;

    std::vector<Action>& getHandlerByTrigger(const std::string& trigger);
    private:
    std::map<std::string, std::vector<Action>> handlersList;
};