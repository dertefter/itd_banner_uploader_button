// ==UserScript==
// @name         смена баннера итд
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Встраивает кнопку смены баннера на странице профиля ИТД
// @match        *://xn--d1ah4a.com/*
// @match        *://итд.com/*
// @match        *://xn--d1ai6a.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 1. Создаем скрытый элемент для выбора файла (добавляем один раз в body)
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    const appendInput = setInterval(() => {
        if (document.body) {
            clearInterval(appendInput);
            document.body.appendChild(fileInput);
        }
    }, 100);

    // 2. Отслеживаем появление блока .CkUM и встраиваем туда кнопку
    // Используем интервал без очистки, чтобы кнопка не пропадала при переходах по сайту (SPA)
    setInterval(() => {
        const container = document.querySelector('.CkUM');

        // Если контейнер есть, а нашей кнопки в нем еще нет — создаем её
        if (container && !container.querySelector('.tm-upload-banner-btn')) {

            const button = document.createElement('button');
            button.title = 'Сменить баннер';
            button.className = 'czqD tm-upload-banner-btn';
            button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
            `;

            // Привязываем вызов выбора файла
            button.addEventListener('click', () => {
                fileInput.click();
            });

            // Вставляем кнопку в начало блока перед кнопкой "Нарисовать баннер"
            container.insertBefore(button, container.firstChild);
        }
    }, 500);

    // 3. Основная логика отправки запросов при выборе файла
    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Ищем нашу кнопку на странице, чтобы изменить её состояние
        const button = document.querySelector('.tm-upload-banner-btn');

        try {
            if (button) {
                button.disabled = true;
                button.style.opacity = '0.4';
                button.title = 'Загрузка...';
            }

            // ШАГ 1: Обновляем токен
            const refreshResponse = await fetch('https://xn--d1ah4a.com/api/v1/auth/refresh', {
                method: 'POST',
                credentials: 'include'
            });

            if (!refreshResponse.ok) throw new Error(`Ошибка обновления токена: ${refreshResponse.status}`);

            const refreshData = await refreshResponse.json();
            const accessToken = refreshData.accessToken;
            if (!accessToken) throw new Error('В ответе сервера отсутствует accessToken');

            // ШАГ 2: Загружаем файл
            const formData = new FormData();
            formData.append('file', file);

            const uploadResponse = await fetch('https://xn--d1ah4a.com/api/files/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                body: formData
            });

            if (!uploadResponse.ok) throw new Error(`Ошибка загрузки файла: ${uploadResponse.status}`);

            const uploadData = await uploadResponse.json();
            const bannerId = uploadData.id;
            if (!bannerId) throw new Error('Сервер не вернул id загруженного файла');

            // ШАГ 3: Устанавливаем баннер
            const updateResponse = await fetch('https://xn--d1ah4a.com/api/users/me', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ bannerId: bannerId })
            });

            if (!updateResponse.ok) throw new Error(`Ошибка обновления баннера: ${updateResponse.status}`);

            alert('Баннер успешно обновлен! Обновите страницу, если изменения не отобразились.');

        } catch (error) {
            console.error(error);
            alert(`Произошла ошибка:\n${error.message}`);
        } finally {
            if (button) {
                button.disabled = false;
                button.style.opacity = '';
                button.title = 'Сменить баннер';
            }
            fileInput.value = '';
        }
    });

})();