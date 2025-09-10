cmake_minimum_required(VERSION 3.14)
project(vectordb CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

if(MSVC)
    add_compile_options(/W3)
else()
    add_compile_options(-Wall -Wextra -Wno-unused-parameter)
endif()

add_executable(db
    src/main.cpp
    src/distance.cpp
)

target_include_directories(db PRIVATE
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/third_party
)

if(WIN32)
    target_link_libraries(db PRIVATE ws2_32)
else()
    find_package(Threads REQUIRED)
    target_link_libraries(db PRIVATE Threads::Threads)
endif()
