// 设置 localStorage 过期时间
const FORM_EXPIRY_TIME = 3 * 60 * 1000; // 3分钟，单位：毫秒
const TARGET_EXPIRY_TIME = 60 * 24 * 60 * 60 * 1000; // 60天，单位：毫秒

// 记录开始时间
let startTime = null;

// 设置新的过期时间
function setExpiryTime(type) {
    if (type === 'form') {
        localStorage.setItem('formExpiryTime', Date.now() + FORM_EXPIRY_TIME);
    } else if (type === 'target') {
        localStorage.setItem('targetExpiryTime', Date.now() + TARGET_EXPIRY_TIME);
    }
}

// 清理过期的 localStorage 数据
function clearExpiredStorage() {
    const formExpiryTime = localStorage.getItem('formExpiryTime');
    const targetExpiryTime = localStorage.getItem('targetExpiryTime');
    
    // 检查个人资料是否过期
    if (formExpiryTime && Date.now() > parseInt(formExpiryTime)) {
        localStorage.removeItem('formData');
        localStorage.removeItem('formExpiryTime');
    }
    
    // 检查目标信息是否过期
    if (targetExpiryTime && Date.now() > parseInt(targetExpiryTime)) {
        localStorage.removeItem('currentTarget');
        localStorage.removeItem('targetExpiryTime');
        localStorage.removeItem('startTime');
    }
}

// 解析 URL 查询参数
function getQueryParams() {
    const params = {};
    const queryString = window.location.search.substring(1);
    const pairs = queryString.split('&');

    for (const pair of pairs) {
        if (pair === '') continue;
        const parts = pair.split('=');
        params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1] || '');
    }

    return params;
}

// 初始化 Select2
$(document).ready(function() {
    // 定期检查并清理过期数据
    setInterval(clearExpiredStorage, 60000); // 每分钟检查一次
    
    // 图片缓存
    const imageCache = new Map();
    
    // 加载本地数据 
    $.getJSON('data.json', function(jsonData) {
        data = jsonData.targets; // 保存数据到全局变量
        $('#targetSearch').select2({
            placeholder: '請選擇或輸入姓名',
            allowClear: true,
            minimumInputLength: 1,
            language: {
                inputTooShort: function() {
                    return '請輸入至少一個漢字，再使用Tab鍵完成確認，按 Space空格鍵顯示完整列表';
                },
                searching: function() {
                    return '搜尋中...';
                },
                noResults: function() {
                    return '找不到符合的結果';
                }
            },
            data: data.map(target => ({
                id: target.name,
                text: `${target.name} (${target.district})`
            }))
        });

        // 处理 URL 查询参数
        const queryParams = getQueryParams();
        if (queryParams.congressperson) {
            // 查找匹配的立委
            const targetName = queryParams.congressperson;
            const target = data.find(t => t.name === targetName);

            if (target) {
                // 选择对应的立委
                const option = new Option(`${target.name} (${target.district})`, target.name, true, true);
                $('#targetSearch').append(option).trigger('change');

                // 加载立委信息
                loadTargetInfo(target.name);
            }
        }
    });

    // 监听选择变化
    $('#targetSearch').on('select2:select', function(e) {
        const selectedName = e.params.data.id;
        // 记录开始时间
        startTime = Date.now();
        localStorage.setItem('startTime', startTime.toString());
        // 清理之前的 PDF 相关数据
        localStorage.removeItem('pdfData');
        localStorage.removeItem('formData');
        localStorage.removeItem('formExpiryTime');
        // 设置新的目标过期时间
        setExpiryTime('target');
        loadTargetInfo(selectedName);
    });

    // 更新標籤雲
    function updateTagCloud() {
        tagCloudContainer.innerHTML = '';
        data.forEach(item => {
            const name = item.name;
            const count = petitionStats[name] || 0;
            const size = Math.max(1, Math.min(2, 1 + count * 0.1)); // 根據連署次數調整大小
            const tag = document.createElement('a');
            tag.className = 'tag-cloud-item';
            tag.textContent = `${name} (${count})`;
            tag.style.fontSize = `${size}em`;
            tag.onclick = function(e) {
                e.preventDefault();
                loadTargetInfo(name);
            };
            tagCloudContainer.appendChild(tag);
        });
    }
});

// 加载目标信息
function loadTargetInfo(name) {
    // 從 data.json 中獲取目標信息
    const target = data.find(t => t.name === name);
    if (!target) {
        console.error('找不到目標信息');
        return;
    }

    // 計算截止日期和剩餘天數
    const deadline = new Date(target.deadline);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 顯示目標信息
    const targetInfo = document.getElementById('targetInfo');
    targetInfo.innerHTML = `
        <p style="font-size: 16px; margin: 0; padding: 10px;">
            罷免對象：<span style="font-size: 24px; color: #ff0000; font-weight: bold;">${target.name}</span> | 
            選區：${target.district} | 
            截止日期：${target.deadline}（還有 ${diffDays} 天）
        </p>
    `;
    targetInfo.style.display = 'block';

    // 隱藏主標題和搜索區域
    document.getElementById('mainTitle').style.display = 'none';
    document.getElementById('searchSection').style.display = 'none';

    // 顯示表單
    document.getElementById('petitionForm').style.display = 'block';

    // 检查是否有 URL 查询参数中的地址
    if (window.location.search) {
        const urlParams = new URLSearchParams(window.location.search);
        const addressParam = urlParams.get('address');
        if (addressParam) {
            // 等待表单显示后填充地址
            setTimeout(() => {
                document.getElementById('address').value = decodeURIComponent(addressParam);
            }, 300);
        }
    }

    // 保存當前目標到 localStorage
    localStorage.setItem('currentTarget', JSON.stringify(target));
    setExpiryTime('target');
    
    // 清除旧的开始时间
    localStorage.removeItem('startTime');
    
    // 設置新的開始時間
    startTime = Date.now();
    localStorage.setItem('startTime', startTime.toString());

    // 为返回选择按钮添加点击事件
    $('.back-to-select-btn').on('click', function() {
        // 隐藏表单和预览区域
        $('#petitionForm').hide();
        $('.preview-container').hide();
        // 显示搜索区域和标签云
        $('#searchSection').show();
        $('#mainTitle').show();
        // 重置 Select2
        $('#targetSearch').val('').trigger('change');
    });
}

// 表单提交处理
$('#petitionForm').on('submit', function(e) {
    e.preventDefault();
    
    // 检查是否有选择目标
    const target = JSON.parse(localStorage.getItem('currentTarget'));
    if (!target) {
        alert('請先選擇罷免對象');
        return;
    }
    
    const formData = {
        name: $('#name').val(),
        idNumber: $('#idNumber').val(),
        birthDate: $('#birthDate').val(),
        address: $('#address').val()
    };
    
    // 存储表单数据到 localStorage
    localStorage.setItem('formData', JSON.stringify(formData));
    // 设置表单数据过期时间
    setExpiryTime('form');
    
    // 隐藏表单
    $('#petitionForm').hide();
    
    generatePDF();
});

// 加载图片
async function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';  // 允许跨域
        
        img.onload = () => resolve(img);
        img.onerror = async (error) => {
            console.error('加载图片失败:', src, error);
            // 尝试从缓存加载
            try {
                const cache = await caches.open('bamian-cache-v1');
                const response = await cache.match(src);
                if (response) {
                    const blob = await response.blob();
                    const objectUrl = URL.createObjectURL(blob);
                    const cachedImg = new Image();
                    cachedImg.crossOrigin = 'anonymous';
                    cachedImg.onload = () => resolve(cachedImg);
                    cachedImg.onerror = () => reject(new Error('无法加载图片'));
                    cachedImg.src = objectUrl;
                } else {
                    reject(new Error('图片未缓存'));
                }
            } catch (cacheError) {
                console.error('从缓存加载图片失败:', cacheError);
                reject(cacheError);
            }
        };
        
        // 先尝试从缓存加载
        caches.match(src).then(async (response) => {
            if (response) {
                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);
                img.src = objectUrl;
            } else {
                // 如果缓存中没有，则从网络加载
                img.src = src;
            }
        }).catch(() => {
            // 如果缓存访问失败，直接从网络加载
            img.src = src;
        });
    });
}

// 在 Canvas 上绘制图片和文字
async function drawOnCanvas(img, formData, fields) {
    // 创建 Canvas
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    // 绘制图片
    ctx.drawImage(img, 0, 0);
    
    // 设置文字样式
    ctx.fillStyle = 'black';
    ctx.textBaseline = 'middle';
    
    // 添加姓名 - 均匀排列
    if (fields.name && formData.name) {
        ctx.font = `${fields.name.fontSize}px Arial`;
        
        const name = formData.name;
        const maxWidth = fields.name.maxWidth;
        const charCount = name.length;
        
        // 计算每个字符的宽度（假设每个字符宽度相同）
        const charWidth = ctx.measureText('测').width; // 使用中文字符测量宽度
        
        // 计算字符之间的间距，使字符均匀分布在maxWidth内
        const totalCharWidth = charWidth * charCount;
        const spacing = (maxWidth - totalCharWidth) / (charCount - 1);
        
        // 计算起始x坐标
        const startX = fields.name.x;
        
        // 绘制每个字符
        for (let i = 0; i < charCount; i++) {
            const x = startX + (charWidth + spacing) * i;
            ctx.fillText(name.charAt(i), x, fields.name.y);
        }
    }
    
    // 添加身份证号 - 均匀排列
    if (fields.idNumber && formData.idNumber) {
        ctx.font = `${fields.idNumber.fontSize}px Arial`;
        
        const idNumber = formData.idNumber;
        const maxWidth = fields.idNumber.maxWidth;
        const charCount = idNumber.length;
        
        // 计算每个字符的宽度（假设每个数字宽度相同）
        const charWidth = ctx.measureText('0').width;
        
        // 计算字符之间的间距，使字符均匀分布在maxWidth内
        const totalCharWidth = charWidth * charCount;
        const spacing = (maxWidth - totalCharWidth) / (charCount - 1);
        
        // 计算起始x坐标
        const startX = fields.idNumber.x;
        
        // 绘制每个字符
        for (let i = 0; i < charCount; i++) {
            const x = startX + (charWidth + spacing) * i;
            ctx.fillText(idNumber.charAt(i), x, fields.idNumber.y);
        }
    }
    
    // 添加出生日期
    ctx.font = `${fields.birthDate.fontSize}px Arial`;
    ctx.fillText(formData.birthDate, fields.birthDate.x, fields.birthDate.y);
    
    // 添加地址 - 支持換行
    ctx.font = `${fields.address.fontSize}px Arial`;
    const address = formData.address;
    const maxWidth = fields.address.maxWidth;
    const lineHeight = fields.address.fontSize * 1.2; // 行高為字體大小的1.2倍
    
    // 如果地址長度超過最大寬度，則需要換行
    if (ctx.measureText(address).width > maxWidth) {
        let currentLine = '';
        let lines = [];
        const words = address.split('');
        
        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + words[i];
            const testWidth = ctx.measureText(testLine).width;
            
            if (testWidth > maxWidth && i > 0) {
                lines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine);
        
        // 繪製每一行
        lines.forEach((line, index) => {
            const y = fields.address.y + (index * lineHeight);
            ctx.fillText(line, fields.address.x, y);
        });
    } else {
        // 如果地址不超過最大寬度，則直接繪製
        ctx.fillText(address, fields.address.x, fields.address.y);
    }
    
    return canvas;
}

// 生成 PDF
async function generatePDF() {
    try {
        // 检查是否有选择目标
        let target = JSON.parse(localStorage.getItem('currentTarget'));
        const targetExpiryTime = localStorage.getItem('targetExpiryTime');
        
        // 如果目标信息不存在或已过期，尝试从当前页面获取
        if (!target || (targetExpiryTime && Date.now() > parseInt(targetExpiryTime))) {
            const targetInfo = $('#targetInfo .alert-info h4').text();
            if (targetInfo) {
                const targetName = targetInfo.replace('罷免對象：', '').trim();
                target = data.find(item => item.name === targetName);
                if (target) {
                    // 重新保存目标信息
                    localStorage.setItem('currentTarget', JSON.stringify(target));
                    localStorage.setItem('targetExpiryTime', Date.now() + (60 * 24 * 60 * 60 * 1000));
                } else {
                    throw new Error('請先選擇罷免對象');
                }
            } else {
                throw new Error('請先選擇罷免對象');
            }
        }
        
        const formData = JSON.parse(localStorage.getItem('formData'));
        if (!formData) {
            return; // 如果沒有表單數據，直接返回，不顯示錯誤
        }
        
        // 检查表单数据是否过期
        const formExpiryTime = localStorage.getItem('formExpiryTime');
        if (formExpiryTime && Date.now() > parseInt(formExpiryTime)) {
            throw new Error('表單資料已過期，請重新填寫');
        }
        
        // 加载模板配置
        let templateConfig;
        try {
            const cache = await caches.open('bamian-cache-v1');
            const response = await cache.match('/config/template-config.json');
            if (!response) {
                throw new Error('模板配置未缓存');
            }
            templateConfig = await response.json();
            console.log('成功加载模板配置:', Object.keys(templateConfig));
        } catch (error) {
            console.error('加载模板配置失败:', error);
            alert('加载模板配置失败，請刷新頁面重試。');
            return;
        }
        
        // 获取当前目标的模板配置
        const targetConfig = templateConfig[target.name];
        
        if (!targetConfig) {
            console.error(`找不到${target.name}的模板配置，可用的配置有:`, Object.keys(templateConfig));
            alert(`找不到${target.name}的模板配置，請聯繫管理員。`);
            return;
        }
        
        console.log(`成功找到${target.name}的模板配置:`, targetConfig);
        
        // 加载模板图片
        const templateImage = await loadImage(targetConfig.template);
        
        // 在 Canvas 上绘制图片和文字
        const canvas = await drawOnCanvas(templateImage, formData, targetConfig.fields);
        
        // 创建新的 jsPDF 实例
        if (typeof window.jspdf === 'undefined') {
            throw new Error('jsPDF 未正确加载');
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',  // 使用横向
            unit: 'mm',
            format: 'a4',
            compress: true // 啟用壓縮
        });
        
        // 获取 Canvas 的图像数据，使用較低的質量以減小文件大小
        const canvasDataUrl = canvas.toDataURL('image/jpeg', 0.7); // 使用 JPEG 格式和 0.7 的質量
        
        // 计算图片在PDF中的尺寸，保持原始比例
        const pageWidth = 297;  // A4 横向宽度（毫米）
        const pageHeight = 210;  // A4 横向高度（毫米）
        
        // 添加图片到 PDF
        doc.addImage(canvasDataUrl, 'JPEG', 0, 0, pageWidth, pageHeight);
        
        // 顯示預覽
        const previewContainer = document.querySelector('.preview-container');
        previewContainer.style.display = 'block';
        
        // 创建按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'd-flex justify-content-between align-items-center mb-3';
        
        // 创建返回按钮
        const backButton = document.createElement('button');
        backButton.className = 'btn btn-secondary me-2';
        backButton.textContent = '返回修改資料';
        backButton.onclick = function() {
            // 隐藏返回按钮和预览区域
            $(this).hide();
            $('.preview-container').hide();
            // 显示表单
            $('#petitionForm').show();
        };
        
        // 创建下载按钮
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn btn-primary me-2';
        downloadBtn.textContent = '下載PDF再去便利店列印';
        downloadBtn.onclick = function() {
            // 下載 PDF
            const link = document.createElement('a');
            link.href = pdfData;
            link.download = `連署書_${formData.name}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 顯示覆蓋層
            showOverlay();
        };
        
        // 创建打印按钮
        const printBtn = document.createElement('button');
        printBtn.className = 'btn btn-success';
        printBtn.textContent = '列印';
        printBtn.onclick = function() {
            // 获取 PDF 数据
            const pdfData = doc.output('blob');
            const blobUrl = URL.createObjectURL(pdfData);
            
            // 在新窗口中打开 PDF
            const printWindow = window.open(blobUrl, '_blank');
            
            // 添加打印样式
            printWindow.onload = function() {
                const style = printWindow.document.createElement('style');
                style.textContent = `
                    @page {
                        size: landscape;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                    }
                    iframe {
                        width: 100%;
                        height: 100vh;
                        border: none;
                        transform: scale(1);
                        transform-origin: 0 0;
                    }
                `;
                printWindow.document.head.appendChild(style);
                
                // 延迟执行打印，确保样式已应用
                setTimeout(function() {
                    printWindow.print();
                    // 打印完成后释放 blob URL
                    URL.revokeObjectURL(blobUrl);
                }, 1000);
            };
            
            // 显示覆盖层
            showOverlay();
        };
        
        // 添加按钮到容器
        buttonContainer.appendChild(backButton);
        buttonContainer.appendChild(downloadBtn);
        buttonContainer.appendChild(printBtn);
        
        // 創建 PNG 預覽容器
        const pngPreviewContainer = document.createElement('div');
        pngPreviewContainer.className = 'png-preview-container';
        pngPreviewContainer.style.width = '80%';
        pngPreviewContainer.style.height = '400px';
        pngPreviewContainer.style.overflow = 'auto';
        pngPreviewContainer.style.border = '1px solid #ddd';
        pngPreviewContainer.style.marginBottom = '20px';
        pngPreviewContainer.style.backgroundColor = '#f8f9fa';
        pngPreviewContainer.style.display = 'flex';
        pngPreviewContainer.style.justifyContent = 'center';
        pngPreviewContainer.style.alignItems = 'center';
        pngPreviewContainer.style.margin = '0 auto';
        pngPreviewContainer.style.position = 'relative';
        
        // 創建 PNG 圖片元素
        const pngImage = document.createElement('img');
        pngImage.style.maxWidth = '100%';
        pngImage.style.maxHeight = '100%';
        pngImage.style.objectFit = 'contain';
        pngImage.style.display = 'none'; // 初始隱藏圖片
        
        // 將 Canvas 轉換為 PNG 圖片
        const previewImageDataUrl = canvas.toDataURL('image/png', 0.8);
        pngImage.src = previewImageDataUrl;
        
        // 創建 PDF 預覽 iframe
        const pdfFrame = document.createElement('iframe');
        pdfFrame.id = 'pdfOverlayIframe';
        pdfFrame.style.width = '100%';
        pdfFrame.style.height = '100%';
        pdfFrame.style.border = 'none';
        pdfFrame.style.position = 'absolute';
        pdfFrame.style.top = '0';
        pdfFrame.style.left = '0';
        pdfFrame.style.zIndex = '1';
        pdfFrame.style.display = 'none'; // 初始隱藏 PDF 預覽
        
        // 將 PDF 數據寫入 iframe - 改為直接設置 src
        const pdfData = doc.output('datauristring');
        // 直接設置 src，並嘗試添加 zoom=page-width 參數 (替代 view=FitH for Safari)
        pdfFrame.src = pdfData + '#zoom=page-width';
        
        // 添加右鍵點擊事件處理
        pngPreviewContainer.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            
            // 切換 PDF 預覽的顯示狀態
            if (pdfFrame.style.display === 'none') {
                pdfFrame.style.display = 'block';
                pngImage.style.display = 'none';
            } else {
                pdfFrame.style.display = 'none';
                pngImage.style.display = 'block';
            }
        });
        
        // 添加加載指示器
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'spinner-border text-primary';
        loadingIndicator.role = 'status';
        loadingIndicator.style.position = 'absolute';
        loadingIndicator.style.top = '50%';
        loadingIndicator.style.left = '50%';
        loadingIndicator.style.transform = 'translate(-50%, -50%)';
        loadingIndicator.style.zIndex = '5';
        loadingIndicator.innerHTML = '<span class="visually-hidden">加載中...</span>';
        pngPreviewContainer.appendChild(loadingIndicator);
        
        // 圖片加載完成後移除加載指示器並顯示圖片
        pngImage.onload = function() {
            loadingIndicator.style.display = 'none';
            pngImage.style.display = 'block';
        };
        
        // 圖片加載失敗處理
        pngImage.onerror = function() {
            loadingIndicator.style.display = 'none';
            showPDFError();
        };
        
        // 將圖片和 PDF 預覽添加到容器
        pngPreviewContainer.appendChild(pngImage);
        pngPreviewContainer.appendChild(pdfFrame);
        
        // 清空預覽容器並添加 PNG 預覽容器
        const pdfPreview = document.getElementById('pdfPreview');
        pdfPreview.innerHTML = '';
        pdfPreview.appendChild(buttonContainer);
        pdfPreview.appendChild(pngPreviewContainer);
        
        // 創建預覽下方的按鈕容器
        const previewBottomButtons = document.createElement('div');
        previewBottomButtons.className = 'd-flex justify-content-between align-items-center mt-3';
        
        // 創建"我要罷免其他區域的立委"按鈕
        const changeTargetBtn = document.createElement('button');
        changeTargetBtn.className = 'btn btn-secondary';
        changeTargetBtn.textContent = '我要罷免其他區域的立委';
        changeTargetBtn.onclick = function() {
            // 隱藏表單和預覽區域
            $('#petitionForm').hide();
            $('.preview-container').hide();
            // 顯示搜索區域和標籤雲
            $('#searchSection').show();
            $('#mainTitle').show();
            // 重置 Select2
            $('#targetSearch').val('').trigger('change');
        };
        
        // 創建"繼續填寫罷免某某某"按鈕
        const continueBtn = document.createElement('button');
        continueBtn.className = 'btn btn-primary';
        continueBtn.textContent = `繼續填寫罷免${target.name}`;
        continueBtn.onclick = function() {
            // 隱藏預覽區域
            $('.preview-container').hide();
            // 顯示表單
            $('#petitionForm').show();
            
            // 清空表單數據
            $('#name').val('');
            $('#idNumber').val('');
            $('#birthDate').val('');
            $('#address').val('');
            
            // 更新開始時間
            startTime = Date.now();
            localStorage.setItem('startTime', startTime.toString());
        };
        
        // 添加按鈕到預覽下方按鈕容器
        previewBottomButtons.appendChild(changeTargetBtn);
        previewBottomButtons.appendChild(continueBtn);
        
        // 添加預覽下方按鈕容器到預覽容器
        pdfPreview.appendChild(previewBottomButtons);
        
        // 添加 PDF 預覽的備用方案 - 放在按鈕之後
        const fallbackMessage = document.createElement('div');
        fallbackMessage.className = 'alert alert-info mt-3';
        fallbackMessage.innerHTML = `
            <p>如果預覽無法顯示，您可以：</p>
            <ol>
                <li>點擊「下載PDF再去便利店列印」按鈕下載文件</li>
                <li>使用其他瀏覽器（如 Firefox）打開本網站</li>
                <li>直接點擊「列印」按鈕進行列印</li>
            </ol>
        `;
        pdfPreview.appendChild(fallbackMessage);
        
        // 添加響應式樣式，優化手機設備顯示
        const responsiveStyle = document.createElement('style');
        responsiveStyle.textContent = `
            @media (max-width: 768px) {
                .png-preview-container {
                    width: 95% !important;
                    height: 300px !important;
                }
                .preview-container {
                    padding: 0 10px;
                }
                .preview-bottom-buttons {
                    flex-direction: column;
                    gap: 10px;
                }
                .preview-bottom-buttons .btn {
                    width: 100%;
                    margin: 0;
                }
            }
        `;
        document.head.appendChild(responsiveStyle);
        
        // 滾動到預覽區域
        previewContainer.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('生成 PDF 失败:', error);
        alert('生成 PDF 失败: ' + error.message);
    }
}

// 显示覆盖层
function showOverlay() {
    try {
        const formData = JSON.parse(localStorage.getItem('formData'));
        const target = JSON.parse(localStorage.getItem('currentTarget'));
        const firstName = formData.name.charAt(0);
        
        // 计算联署用时
        const endTime = Date.now();
        // 从 localStorage 获取开始时间
        const storedStartTime = localStorage.getItem('startTime');
        startTime = storedStartTime ? parseInt(storedStartTime) : endTime;
        
        // 确保时间有效
        if (isNaN(startTime) || isNaN(endTime) || endTime < startTime) {
            console.error('时间计算错误:', { startTime, endTime });
            startTime = endTime;
        }
        
        const timeSpent = Math.round((endTime - startTime) / 1000); // 转换为秒
        
        const message = `${firstName} ** 先生/小姐，罷免不適任的${target.name}可以讓立法院回歸正軌。\n\n感謝你行使自己的政治權利。\n\n你連署只花了${timeSpent}秒，你擊敗了100%的中國人！`;
        $('.overlay-message').text(message);
        
        // 更新继续按钮的文本
        $('#continueBtn').text(`繼續填寫罷免${target.name}`);
        
        // 添加关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn-close position-absolute top-0 end-0 m-3';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.onclick = function() {
            $('#overlay').hide();
        };
        
        // 确保关闭按钮在overlay-content内部
        const overlayContent = document.querySelector('.overlay-content');
        overlayContent.style.position = 'relative';
        overlayContent.appendChild(closeBtn);
        
        $('#overlay').show();
        // 确保继续按钮获得焦点
        setTimeout(() => {
            $('#continueBtn').focus();
        }, 100);
    } catch (error) {
        console.error('显示覆盖层失败:', error);
    }
}

// 处理覆盖层按钮点击事件
$(document).ready(function() {
    // 继续罢免当前对象
    $('#continueBtn').on('click', function() {
        // 隐藏覆盖层
        $('#overlay').hide();
        
        // 清空表单数据
        $('#name').val('');
        $('#idNumber').val('');
        $('#birthDate').val('');
        $('#address').val('');
        
        // 更新开始时间
        startTime = Date.now();
        localStorage.setItem('startTime', startTime.toString());
        
        // 显示表单
        $('#petitionForm').show();
        
        // 隐藏预览区域
        $('.preview-container').hide();
    });
    
    // 选择其他区域对象
    $('#changeBtn').on('click', function() {
        // 隐藏覆盖层
        $('#overlay').hide();
        
        // 清空所有数据
        localStorage.removeItem('currentTarget');
        localStorage.removeItem('formData');
        localStorage.removeItem('startTime');
        
        // 重置计时器
        startTime = null;
        
        // 显示主标题和搜索区域
        $('#mainTitle').show();
        $('#searchSection').show();
        
        // 隐藏目标信息和表单
        $('#targetInfo').hide();
        $('#petitionForm').hide();
        
        // 隐藏预览区域
        $('.preview-container').hide();
        
        // 重置 Select2
        $('#targetSearch').val(null).trigger('change');
    });
});

// 顯示連署表單
function showPetitionForm(name) {
    // 隱藏搜索區域和標籤雲
    searchSection.style.display = 'none';
    
    // 隱藏主標題
    document.getElementById('mainTitle').style.display = 'none';
    
    // 顯示表單
    const petitionForm = document.getElementById('petitionForm');
    petitionForm.style.display = 'block';
    
    // 检查是否已经存在返回选择按钮
    let backToSelectBtn = $('#petitionForm').find('.back-to-select-btn');
    if (backToSelectBtn.length === 0) {
        // 如果不存在，则创建并添加
        backToSelectBtn = $('<button>')
            .addClass('btn btn-secondary mt-3 back-to-select-btn')
            .text('返回選擇罷免對象')
            .on('click', function() {
                // 隐藏表单和预览区域
                $('#petitionForm').hide();
                $('.preview-container').hide();
                // 显示搜索区域和标签云
                $('#searchSection').show();
                $('#mainTitle').show();
                // 重置 Select2
                $('#targetSearch').val('').trigger('change');
            });
        
        // 将返回选择按钮添加到表单下方
        $('#petitionForm').append(backToSelectBtn);
    }
    
    // 更新連署統計
    updatePetitionStats(name);
    
    // 清除旧的开始时间
    localStorage.removeItem('startTime');
    
    // 設置新的開始時間
    startTime = Date.now();
    localStorage.setItem('startTime', startTime.toString());
    
    // 顯示目標信息
    const targetInfo = document.getElementById('targetInfo');
    const target = data.find(item => item.name === name);
    if (target) {
        // 計算剩餘天數
        const deadline = new Date(target.deadline).getTime();
        const today = new Date().getTime();
        const diffTime = deadline - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        targetInfo.innerHTML = `
            <div class="alert alert-info">
                <h4 class="mb-2">罷免對象：${target.name}</h4>
                <p class="mb-1">選區：${target.district}</p>
                <p class="mb-0">截止日期：${target.deadline}（還有 ${diffDays} 天）</p>
            </div>
        `;
        targetInfo.style.display = 'block';
    }
}

// 處理"我要罷免其他區域的立法委員"按鈕點擊事件
changeBtn.addEventListener('click', function() {
    // 顯示搜索區域和標籤雲
    searchSection.style.display = 'block';
    // 隱藏結果區域和表單
    resultSection.style.display = 'none';
    document.getElementById('petitionForm').style.display = 'none';
    // 隱藏覆蓋層
    document.getElementById('overlay').style.display = 'none';
    // 顯示主標題
    document.getElementById('mainTitle').style.display = 'block';
    // 隱藏目標信息
    document.getElementById('targetInfo').style.display = 'none';
    // 重置 Select2
    $(targetSearch).val('').trigger('change');
});

// 添加 PDF 錯誤處理函數
function showPDFError() {
    const errorMessage = document.createElement('div');
    errorMessage.className = 'alert alert-warning mt-3';
    errorMessage.innerHTML = `
        <p>PDF 預覽加載失敗，請嘗試以下方法：</p>
        <ol>
            <li>點擊「下載PDF再去便利店列印」按鈕下載文件</li>
            <li>使用其他瀏覽器（如 Firefox）打開本網站</li>
            <li>直接點擊「列印」按鈕進行列印</li>
        </ol>
    `;
    
    const pdfPreview = document.getElementById('pdfPreview');
    pdfPreview.insertBefore(errorMessage, pdfPreview.firstChild);
}

// 全形數字轉換為半形數字的函數
function convertFullWidthToHalfWidth(str) {
    return str.replace(/[\uFF10-\uFF19]/g, function(s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
}

// 驗證身份證字號的函數
function validateIdNumber(idNumberInput) {
    let processedIdNumber = idNumberInput.value.trim();
    
    // 將全形數字轉換為半形數字
    processedIdNumber = convertFullWidthToHalfWidth(processedIdNumber);
    
    // 移除所有非字母和數字的字符
    processedIdNumber = processedIdNumber.replace(/[^A-Za-z0-9]/g, '');
    
    // 如果第一個字符是小寫字母，轉為大寫
    if (processedIdNumber.length > 0 && /[a-z]/.test(processedIdNumber[0])) {
        processedIdNumber = processedIdNumber[0].toUpperCase() + processedIdNumber.slice(1);
    }
    
    // 如果有字母，確保只有一個字母且在開頭
    if (processedIdNumber.match(/[A-Za-z]/g)?.length > 1) {
        processedIdNumber = processedIdNumber.replace(/[A-Za-z]/g, (match, offset) => {
            return offset === 0 ? match : '';
        });
    }
    
    // 如果有數字，只保留前9個數字
    const numbers = processedIdNumber.match(/\d/g) || [];
    const digits = numbers.slice(0, 9).join('');
    
    // 重新組合：字母 + 數字
    processedIdNumber = (processedIdNumber.match(/[A-Z]/) || [''])[0] + digits;
    
    // 檢查格式是否符合要求：一個字母後跟9個數字
    const idNumberPattern = /^[A-Z]\d{9}$/;
    if (!idNumberPattern.test(processedIdNumber)) {
        // 更新輸入框的值為處理後的值
        idNumberInput.value = processedIdNumber;
        idNumberInput.focus();
        idNumberInput.select();
        
        // 添加錯誤樣式
        idNumberInput.classList.remove('success');
        idNumberInput.classList.add('error');
        
        // 2秒後移除動畫類，保持紅色邊框
        setTimeout(() => {
            idNumberInput.style.animation = 'none';
        }, 2000);
        
        return false;
    }
    
    // 更新輸入框的值為處理後的值
    idNumberInput.value = processedIdNumber;
    
    // 添加成功樣式
    idNumberInput.classList.remove('error');
    idNumberInput.classList.add('success');
    
    return true;
}

// 驗證出生日期的函數
function validateBirthDate(birthDateInput) {
    let processedBirthDate = birthDateInput.value.trim();
    
    // 將全形數字轉換為半形數字
    processedBirthDate = convertFullWidthToHalfWidth(processedBirthDate);
    
    // 移除所有非數字的字符
    processedBirthDate = processedBirthDate.replace(/\D/g, '');
    
    // 檢查格式是否符合要求：6個數字或7個數字
    const is6Digits = /^\d{6}$/.test(processedBirthDate);
    const is7Digits = /^\d{7}$/.test(processedBirthDate);
    
    // 驗證6位數格式
    if (is6Digits) {
        const month = parseInt(processedBirthDate.substring(2, 4));
        const day = parseInt(processedBirthDate.substring(4, 6));
        
        // 檢查月份是否在1-12之間
        if (month < 1 || month > 12) {
            birthDateInput.value = processedBirthDate;
            birthDateInput.focus();
            birthDateInput.select();
            birthDateInput.classList.remove('success');
            birthDateInput.classList.add('error');
            setTimeout(() => {
                birthDateInput.style.animation = 'none';
            }, 2000);
            return false;
        }
        
        // 檢查日期是否有效
        const daysInMonth = getDaysInMonth(month);
        if (day < 1 || day > daysInMonth) {
            birthDateInput.value = processedBirthDate;
            birthDateInput.focus();
            birthDateInput.select();
            birthDateInput.classList.remove('success');
            birthDateInput.classList.add('error');
            setTimeout(() => {
                birthDateInput.style.animation = 'none';
            }, 2000);
            return false;
        }
    }
    
    // 驗證7位數格式
    if (is7Digits) {
        const year = parseInt(processedBirthDate.substring(0, 1));
        const month = parseInt(processedBirthDate.substring(3, 5));
        const day = parseInt(processedBirthDate.substring(5, 7));
        
        // 檢查年份是否為1
        if (year > 1) {
            birthDateInput.value = processedBirthDate;
            birthDateInput.focus();
            birthDateInput.select();
            birthDateInput.classList.remove('success');
            birthDateInput.classList.add('error');
            setTimeout(() => {
                birthDateInput.style.animation = 'none';
            }, 2000);
            return false;
        }
        
        // 檢查月份是否在1-12之間
        if (month < 1 || month > 12) {
            birthDateInput.value = processedBirthDate;
            birthDateInput.focus();
            birthDateInput.select();
            birthDateInput.classList.remove('success');
            birthDateInput.classList.add('error');
            setTimeout(() => {
                birthDateInput.style.animation = 'none';
            }, 2000);
            return false;
        }
        
        // 檢查日期是否有效
        const daysInMonth = getDaysInMonth(month);
        if (day < 1 || day > daysInMonth) {
            birthDateInput.value = processedBirthDate;
            birthDateInput.focus();
            birthDateInput.select();
            birthDateInput.classList.remove('success');
            birthDateInput.classList.add('error');
            setTimeout(() => {
                birthDateInput.style.animation = 'none';
            }, 2000);
            return false;
        }
    }
    
    // 如果既不是6位數也不是7位數，則不合法
    if (!is6Digits && !is7Digits) {
        birthDateInput.value = processedBirthDate;
        birthDateInput.focus();
        birthDateInput.select();
        birthDateInput.classList.remove('success');
        birthDateInput.classList.add('error');
        setTimeout(() => {
            birthDateInput.style.animation = 'none';
        }, 2000);
        return false;
    }
    
    // 更新輸入框的值為處理後的值
    birthDateInput.value = processedBirthDate;
    
    // 添加成功樣式
    birthDateInput.classList.remove('error');
    birthDateInput.classList.add('success');
    
    return true;
}

// 獲取指定月份的天數
function getDaysInMonth(month) {
    // 簡單的月份天數判斷，不考慮閏年
    const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return daysInMonth[month];
}

// 添加輸入框的全形數字轉換事件
document.addEventListener('DOMContentLoaded', function() {
    // 為所有輸入框添加輸入事件監聽器
    const inputFields = ['name', 'idNumber', 'birthDate', 'address'];
    
    inputFields.forEach(fieldId => {
        const input = document.getElementById(fieldId);
        if (input) {
            input.addEventListener('input', function() {
                // 將全形數字轉換為半形數字
                this.value = convertFullWidthToHalfWidth(this.value);
            });
        }
    });
}); 