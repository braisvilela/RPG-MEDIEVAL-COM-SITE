@echo off
title Servidor RPG Multiplayer

cd /d "C:\Users\Administrator\Desktop\RPG MEDIEVAL COM SITE\public"

:senha
set "ADMIN_PASSWORD="
set /p "ADMIN_PASSWORD=Digite a senha do administrador (minimo 10 caracteres): "

if not defined ADMIN_PASSWORD (
    echo ERRO: A senha nao pode estar vazia.
    goto senha
)

call :verificarSenha
if errorlevel 1 (
    echo ERRO: A senha precisa ter pelo menos 10 caracteres.
    goto senha
)

echo.
echo =====================================
echo      SERVIDOR RPG MULTIPLAYER
echo =====================================
echo.
echo Iniciando servidor...
call npm start

pause
exit /b

:verificarSenha
setlocal EnableDelayedExpansion
set "valor=!ADMIN_PASSWORD!"
set /a tamanho=0

:contar
if defined valor (
    set "valor=!valor:~1!"
    set /a tamanho+=1
    goto contar
)

if %tamanho% LSS 10 (
    endlocal & exit /b 1
)

endlocal & exit /b 0