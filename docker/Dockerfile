# use debian as base image
# FROM debian:stretch
FROM ubuntu:21.04

EXPOSE 8888

# Label image
LABEL \
    "Description"="Docker image to do compilation of StructuresKit.jl to WASM" \
    "Github Source"="https://github.com/benjym/structures-vr/" \
    "Dockerfile Author"="Benjy Marks" \
    "Email"="benjy.marks@sydney.edu.au"

# Install useful programs
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
    git \
    python3 \
    python3-pip \
    wget \
    nano \
    julia \
    nodejs \
    npm \
    cmake \
    gcc-multilib \
    g++-multilib \
    ninja-build \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Change default shell from dash to bash permanently
RUN ln -sf bash /bin/sh

ARG WORK_DIR=/home/work/
ENV WORK_DIR=${WORK_DIR}
RUN mkdir -p ${WORK_DIR}

# Prepare container environment

# Set some bash aliases so I don't freak out
RUN echo 'alias ..="cd .."' >> ~/.bashrc
RUN echo 'alias ll="ls -lha"' >> ~/.bashrc

# Install emsdk
WORKDIR ${WORK_DIR}
RUN git clone https://github.com/emscripten-core/emsdk.git
WORKDIR ${WORK_DIR}/emsdk
RUN ./emsdk install emscripten-main-64bit binaryen-main-64bit
RUN ./emsdk activate emscripten-main-64bit binaryen-main-64bit

# Install upstream LLVM
WORKDIR ${WORK_DIR}
RUN git clone https://github.com/llvm/llvm-project.git
RUN mkdir llvm-build
WORKDIR ${WORK_DIR}/llvm-build
RUN cmake -G Ninja -DLLVM_ENABLE_PROJECTS="clang;lld" -DCMAKE_BUILD_TYPE=Release ../llvm-project/llvm
RUN ninja

RUN echo "LLVM_ROOT = '${WORK_DIR}/llvm-build/bin'" > ${HOME}/.emscripten
ENV PATH=${WORK_DIR}/llvm-build/bin:${PATH}

WORKDIR ${WORK_DIR}
CMD git clone https://github.com/Keno/julia-wasm.git

WORKDIR ${WORK_DIR}/julia-wasm
# Do this once
CMD sh configure-julia-wasm.sh
# this command may fail at the very end of the build process, that's normal
CMD sh build-julia-wasm.sh
# Do this after you change something on the wasm side
CMD sh rebuild_js.sh

RUN emrun --no_browser --port 8888 website/repl.htm &
