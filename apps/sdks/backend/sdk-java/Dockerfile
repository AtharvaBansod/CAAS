FROM maven:3.9.8-eclipse-temurin-17
WORKDIR /workspace
COPY pom.xml ./
COPY src ./src
CMD ["mvn", "-q", "test"]
