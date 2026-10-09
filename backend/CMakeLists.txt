cmake_minimum_required(VERSION 3.20)

project(beta_komando_backend VERSION 0.1.0 LANGUAGES CXX)

include(FetchContent)

FetchContent_Declare(
    nlohmann_json
    GIT_REPOSITORY https://github.com/nlohmann/json.git
    GIT_TAG v3.12.0
    GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(nlohmann_json)

find_package(Threads REQUIRED)

add_library(dispatcher src/dispatcher.cpp)
target_include_directories(dispatcher PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}/src")
target_compile_features(dispatcher PUBLIC cxx_std_20)
target_link_libraries(dispatcher PUBLIC Threads::Threads)

include(CTest)
if(BUILD_TESTING)
    add_executable(dispatcher_tests tests/dispatcher_tests.cpp)
    target_link_libraries(dispatcher_tests PRIVATE dispatcher)
    foreach(case IN ITEMS ownership validation lifetime exceptions concurrent_sends
                          registration_during_send concurrent_registration)
        add_test(NAME dispatcher_${case} COMMAND dispatcher_tests ${case})
        set_tests_properties(dispatcher_${case} PROPERTIES TIMEOUT 15)
    endforeach()
endif()

add_executable(beta_komando_backend
    src/main.cpp
    src/simulation.cpp
    src/simulation_controller.cpp
    src/websocket.cpp
)

target_compile_features(beta_komando_backend PRIVATE cxx_std_20)
target_link_libraries(beta_komando_backend PRIVATE nlohmann_json::nlohmann_json dispatcher)

if(WIN32)
    target_link_libraries(beta_komando_backend PRIVATE ws2_32)
endif()

if(MSVC)
    target_compile_options(beta_komando_backend PRIVATE /W4 /permissive-)
else()
    target_compile_options(beta_komando_backend PRIVATE -Wall -Wextra -Wpedantic)
endif()

