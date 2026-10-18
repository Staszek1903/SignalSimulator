#include <functional>
#include <map>
#include <string>
#include <vector>

class State{
    public:
    using Action = std::function<void()>;

    std::vector<Action>& getHandlerByTrigger(const std::string& trigger);
    std::string getName(){
        return name;
    }
    private:
    std::string name;
    std::map<std::string, std::vector<Action>> handlersList;
};