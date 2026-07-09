@echo off
set BASE_DIR=%~dp0
set WRAPPER_JAR=%BASE_DIR%\.mvn\wrapper\maven-wrapper.jar

if "%MAVEN_USER_HOME%"=="" (
  set MAVEN_USER_HOME=%BASE_DIR%\.mvn-user
)

if not exist "%WRAPPER_JAR%" (
  echo Maven Wrapper jar is missing: %WRAPPER_JAR% 1>&2
  echo Generate it with an installed Maven using: mvn -N wrapper:wrapper -Dmaven=3.8.8 1>&2
  exit /b 1
)

java -Dmaven.multiModuleProjectDirectory="%BASE_DIR%" -Dmaven.repo.local="%MAVEN_USER_HOME%\repository" -classpath "%WRAPPER_JAR%" org.apache.maven.wrapper.MavenWrapperMain %*
