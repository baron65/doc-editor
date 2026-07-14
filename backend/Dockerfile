# syntax=docker/dockerfile:1

FROM eclipse-temurin:11-jdk AS build

WORKDIR /build
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw mvnw.cmd ./
RUN chmod +x mvnw && ./mvnw -B -DskipTests dependency:go-offline

COPY src src
RUN ./mvnw -B -DskipTests package

FROM eclipse-temurin:11-jre

ENV TZ=Asia/Shanghai \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -Dfile.encoding=UTF-8"

WORKDIR /app
COPY --from=build /build/target/*.jar /app/app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
