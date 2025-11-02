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
    src/bruteforce.cpp
    src/kdtree.cpp
    src/hnsw.cpp
    src/vectordb.cpp
    src/demo_data.cpp
    src/json_utils.cpp
    src/text_utils.cpp
    src/ollama_client.cpp
    src/documentdb.cpp
    src/routes.cpp
    src/storage.cpp
)

target_include_directories(db PRIVATE
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/third_party
)

find_package(PostgreSQL REQUIRED)
target_include_directories(db PRIVATE ${PostgreSQL_INCLUDE_DIRS})

if(WIN32)
    target_link_libraries(db PRIVATE ws2_32 ${PostgreSQL_LIBRARIES})
else()
    find_package(Threads REQUIRED)
    target_link_libraries(db PRIVATE Threads::Threads ${PostgreSQL_LIBRARIES})
endif()
