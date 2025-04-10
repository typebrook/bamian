<?php
// 设置密码保护
$password = "fanqingfuming"; // 请修改为您的安全密码

// 检查是否已登录
session_start();
$is_logged_in = isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;

// 处理登录请求
if (isset($_POST['password'])) {
    if ($_POST['password'] === $password) {
        $_SESSION['logged_in'] = true;
        $is_logged_in = true;
    } else {
        $error_message = "密码错误，请重试。";
    }
}

// 处理登出请求
if (isset($_GET['logout'])) {
    session_destroy();
    header("Location: coordinate_marker.php");
    exit;
}

// 获取images文件夹中的所有图片
$images_dir = "images/";
$images = [];
$image_sizes = [];
if (is_dir($images_dir)) {
    $files = scandir($images_dir);
    foreach ($files as $file) {
        if ($file != "." && $file != ".." && (strtolower(pathinfo($file, PATHINFO_EXTENSION)) == "png" || strtolower(pathinfo($file, PATHINFO_EXTENSION)) == "jpg" || strtolower(pathinfo($file, PATHINFO_EXTENSION)) == "jpeg")) {
            $images[] = $file;
            // 获取图片的原始尺寸
            $image_path = $images_dir . $file;
            $image_info = getimagesize($image_path);
            if ($image_info) {
                $image_sizes[$file] = [
                    'width' => $image_info[0],
                    'height' => $image_info[1]
                ];
            }
        }
    }
}

// 处理坐标保存请求
if ($is_logged_in && isset($_POST['save_coordinates'])) {
    $image_name = $_POST['image_name'];
    $coordinates = json_decode($_POST['coordinates'], true);
    
    // 读取现有的配置文件
    $config_file = "config/template-config.json";
    $config_data = [];
    if (file_exists($config_file)) {
        $config_data = json_decode(file_get_contents($config_file), true);
    }
    
    // 提取文件名（不含扩展名）作为键
    $name_without_ext = pathinfo($image_name, PATHINFO_FILENAME);
    
    // 更新或创建配置
    $config_data[$name_without_ext] = [
        "template" => "images/" . $image_name,
        "fields" => [
            "name" => [
                "x" => $coordinates[0]['x'],
                "y" => $coordinates[0]['y'],
                "fontSize" => 45,
                "maxWidth" => 478,
                "align" => "center"
            ],
            "idNumber" => [
                "x" => $coordinates[1]['x'],
                "y" => $coordinates[1]['y'],
                "fontSize" => 50,
                "maxWidth" => 478,
                "align" => "left"
            ],
            "birthDate" => [
                "x" => $coordinates[2]['x'],
                "y" => $coordinates[2]['y'],
                "fontSize" => 55,
                "maxWidth" => 100,
                "align" => "left"
            ],
            "address" => [
                "x" => $coordinates[3]['x'],
                "y" => $coordinates[3]['y'],
                "fontSize" => 45,
                "maxWidth" => 750,
                "align" => "left"
            ]
        ]
    ];
    
    // 保存更新后的配置
    file_put_contents($config_file, json_encode($config_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    
    $success_message = "坐标已成功保存到配置文件！";
}

// 如果不是登录状态，显示登录表单
if (!$is_logged_in) {
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <title>坐标标记工具 - 登录</title>
        <meta charset="UTF-8">
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f5f5f5;
                margin: 0;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
            }
            .login-container {
                background-color: white;
                padding: 30px;
                border-radius: 5px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                width: 300px;
            }
            h1 {
                text-align: center;
                margin-bottom: 20px;
                color: #333;
            }
            .form-group {
                margin-bottom: 15px;
            }
            label {
                display: block;
                margin-bottom: 5px;
                color: #555;
            }
            input[type="password"] {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                box-sizing: border-box;
            }
            button {
                width: 100%;
                padding: 10px;
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            button:hover {
                background-color: #45a049;
            }
            .error {
                color: red;
                margin-bottom: 15px;
            }
        </style>
    </head>
    <body>
        <div class="login-container">
            <h1>坐标标记工具</h1>
            <?php if (isset($error_message)): ?>
                <div class="error"><?php echo $error_message; ?></div>
            <?php endif; ?>
            <form method="post">
                <div class="form-group">
                    <label for="password">密码:</label>
                    <input type="password" id="password" name="password" required>
                </div>
                <button type="submit">登录</button>
            </form>
        </div>
    </body>
    </html>
    <?php
} else {
    // 已登录，显示坐标标记工具
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <title>坐标标记工具</title>
        <meta charset="UTF-8">
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f5f5f5;
            }
            .container {
                display: flex;
                max-width: 1400px;
                margin: 0 auto;
                background-color: white;
                border-radius: 5px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .sidebar {
                width: 250px;
                background-color: #f0f0f0;
                padding: 15px;
                border-right: 1px solid #ddd;
                overflow-y: auto;
                max-height: 90vh;
            }
            .main-content {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
                max-height: 90vh;
            }
            .image-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            .image-item {
                padding: 8px 10px;
                margin-bottom: 5px;
                background-color: #e9e9e9;
                border-radius: 3px;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            .image-item:hover {
                background-color: #d0d0d0;
            }
            .image-item.active {
                background-color: #4CAF50;
                color: white;
            }
            .image-container {
                position: relative;
                margin-bottom: 20px;
                overflow: auto;
                max-height: 70vh;
                border: 1px solid #ddd;
            }
            .image-preview {
                display: block;
                border: none;
            }
            .coordinates-list {
                margin-top: 20px;
                border: 1px solid #ddd;
                padding: 15px;
                border-radius: 5px;
            }
            .coordinate-item {
                margin-bottom: 10px;
                padding: 10px;
                background-color: #f9f9f9;
                border-radius: 3px;
            }
            .coordinate-item h3 {
                margin-top: 0;
                margin-bottom: 5px;
            }
            .coordinate-display {
                font-family: monospace;
                background-color: #eee;
                padding: 5px;
                border-radius: 3px;
            }
            .instructions {
                margin-bottom: 20px;
                padding: 15px;
                background-color: #e8f5e9;
                border-radius: 5px;
                border-left: 4px solid #4CAF50;
            }
            .instructions h2 {
                margin-top: 0;
                color: #2e7d32;
            }
            .instructions ol {
                padding-left: 20px;
            }
            .instructions li {
                margin-bottom: 8px;
            }
            .button-container {
                margin-top: 20px;
                display: flex;
                gap: 10px;
            }
            button {
                padding: 10px 15px;
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }
            button:hover {
                background-color: #45a049;
            }
            button.secondary {
                background-color: #f44336;
            }
            button.secondary:hover {
                background-color: #d32f2f;
            }
            .logout {
                position: absolute;
                top: 20px;
                right: 20px;
            }
            .success-message {
                background-color: #dff0d8;
                color: #3c763d;
                padding: 10px;
                border-radius: 4px;
                margin-bottom: 15px;
            }
            .marker {
                position: absolute;
                width: 10px;
                height: 10px;
                background-color: red;
                border-radius: 50%;
                transform: translate(-50%, -50%);
                cursor: pointer;
            }
            .marker-label {
                position: absolute;
                background-color: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 2px 5px;
                border-radius: 3px;
                font-size: 12px;
                transform: translate(-50%, -100%);
                margin-top: -5px;
            }
            .image-info {
                margin-top: 10px;
                font-size: 14px;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="sidebar">
                <h2>图片列表</h2>
                <ul class="image-list">
                    <?php foreach ($images as $image): ?>
                        <li class="image-item" data-image="<?php echo $image; ?>" data-width="<?php echo $image_sizes[$image]['width']; ?>" data-height="<?php echo $image_sizes[$image]['height']; ?>"><?php echo $image; ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
            <div class="main-content">
                <a href="?logout=1" class="logout"><button>登出</button></a>
                
                <?php if (isset($success_message)): ?>
                    <div class="success-message"><?php echo $success_message; ?></div>
                <?php endif; ?>
                
                <div class="instructions">
                    <h2>使用说明</h2>
                    <ol>
                        <li>从左侧列表选择一张图片</li>
                        <li>在图片上点击4个位置来标记坐标点</li>
                        <li>按照以下顺序标记坐标点：
                            <ul>
                                <li>第1点：姓名区域的左上角 (name.x, name.y)</li>
                                <li>第2点：身份证号区域的左上角 (idNumber.x, idNumber.y)</li>
                                <li>第3点：出生日期区域的左上角 (birthDate.x, birthDate.y)</li>
                                <li>第4点：地址区域的左上角 (address.x, address.y)</li>
                            </ul>
                        </li>
                        <li>点击"保存坐标"按钮将坐标保存到配置文件</li>
                    </ol>
                </div>
                
                <div class="image-container">
                    <img id="image-preview" class="image-preview" src="" alt="选择图片">
                    <div id="markers-container"></div>
                </div>
                <div class="image-info" id="image-info"></div>
                
                <div class="coordinates-list">
                    <h2>已标记的坐标</h2>
                    <div id="coordinates-display"></div>
                </div>
                
                <div class="button-container">
                    <button id="save-coordinates">保存坐标</button>
                    <button id="reset-coordinates" class="secondary">重置坐标</button>
                </div>
                
                <form id="save-form" method="post" style="display: none;">
                    <input type="hidden" name="image_name" id="image-name-input">
                    <input type="hidden" name="coordinates" id="coordinates-input">
                    <input type="hidden" name="save_coordinates" value="1">
                </form>
            </div>
        </div>
        
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                const imageList = document.querySelectorAll('.image-item');
                const imagePreview = document.getElementById('image-preview');
                const markersContainer = document.getElementById('markers-container');
                const coordinatesDisplay = document.getElementById('coordinates-display');
                const saveButton = document.getElementById('save-coordinates');
                const resetButton = document.getElementById('reset-coordinates');
                const saveForm = document.getElementById('save-form');
                const imageNameInput = document.getElementById('image-name-input');
                const coordinatesInput = document.getElementById('coordinates-input');
                const imageInfo = document.getElementById('image-info');
                
                let currentImage = '';
                let coordinates = [];
                const maxCoordinates = 4;
                let originalWidth = 0;
                let originalHeight = 0;
                
                // 点击图片列表项
                imageList.forEach(item => {
                    item.addEventListener('click', function() {
                        // 移除所有active类
                        imageList.forEach(i => i.classList.remove('active'));
                        // 添加active类到当前项
                        this.classList.add('active');
                        
                        // 设置当前图片
                        currentImage = this.getAttribute('data-image');
                        originalWidth = parseInt(this.getAttribute('data-width'));
                        originalHeight = parseInt(this.getAttribute('data-height'));
                        
                        // 设置图片原始尺寸
                        imagePreview.src = '<?php echo $images_dir; ?>' + currentImage;
                        imagePreview.width = originalWidth;
                        imagePreview.height = originalHeight;
                        
                        // 显示图片信息
                        imageInfo.textContent = `图片尺寸: ${originalWidth} x ${originalHeight} 像素`;
                        
                        // 重置坐标
                        coordinates = [];
                        updateCoordinatesDisplay();
                        markersContainer.innerHTML = '';
                    });
                });
                
                // 点击图片添加坐标
                imagePreview.addEventListener('click', function(e) {
                    if (coordinates.length >= maxCoordinates) {
                        alert('已达到最大坐标点数量！');
                        return;
                    }
                    
                    const rect = this.getBoundingClientRect();
                    const x = Math.round(e.clientX - rect.left);
                    const y = Math.round(e.clientY - rect.top);
                    
                    coordinates.push({x, y});
                    
                    // 添加标记
                    const marker = document.createElement('div');
                    marker.className = 'marker';
                    marker.style.left = x + 'px';
                    marker.style.top = y + 'px';
                    
                    const label = document.createElement('div');
                    label.className = 'marker-label';
                    label.textContent = coordinates.length;
                    marker.appendChild(label);
                    
                    markersContainer.appendChild(marker);
                    
                    updateCoordinatesDisplay();
                });
                
                // 更新坐标显示
                function updateCoordinatesDisplay() {
                    coordinatesDisplay.innerHTML = '';
                    
                    if (coordinates.length === 0) {
                        coordinatesDisplay.innerHTML = '<p>尚未标记任何坐标点</p>';
                        return;
                    }
                    
                    const coordinateNames = [
                        '姓名区域左上角 (name.x, name.y)',
                        '身份证号区域左上角 (idNumber.x, idNumber.y)',
                        '出生日期区域左上角 (birthDate.x, birthDate.y)',
                        '地址区域左上角 (address.x, address.y)'
                    ];
                    
                    coordinates.forEach((coord, index) => {
                        const item = document.createElement('div');
                        item.className = 'coordinate-item';
                        
                        const name = document.createElement('h3');
                        name.textContent = coordinateNames[index];
                        
                        const display = document.createElement('div');
                        display.className = 'coordinate-display';
                        display.textContent = `坐标 ${index + 1}: x=${coord.x}, y=${coord.y}`;
                        
                        item.appendChild(name);
                        item.appendChild(display);
                        coordinatesDisplay.appendChild(item);
                    });
                }
                
                // 保存坐标
                saveButton.addEventListener('click', function() {
                    if (coordinates.length !== maxCoordinates) {
                        alert('请标记所有4个坐标点！');
                        return;
                    }
                    
                    imageNameInput.value = currentImage;
                    coordinatesInput.value = JSON.stringify(coordinates);
                    saveForm.submit();
                });
                
                // 重置坐标
                resetButton.addEventListener('click', function() {
                    coordinates = [];
                    markersContainer.innerHTML = '';
                    updateCoordinatesDisplay();
                });
            });
        </script>
    </body>
    </html>
    <?php
}
?> 