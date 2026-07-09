@echo off
set BASE_DIR=%~dp0
set WRAPPER_JAR=%BASE_DIR%\.mvn\wrapper\maven-wrapper.jar

if not exist "%WRAPPER_JAR%" (
  echo Maven Wrapper jar is missing: %WRAPPER_JAR% 1>&2
  echo Generate it with an installed Maven using: mvn -N wrapper:wrapper -Dmaven=3.5.4 1>&2
  exit /b 1
)

java -Dmaven.multiModuleProjectDirectory="%BASE_DIR%" -classpath "%WRAPPER_JAR%" org.apache.maven.wrapper.MavenWrapperMain %*
