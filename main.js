// 全局变量
let orderData = []; // 委托数据
let deviceData = []; // 设备数据
let scheduleResults = []; // 排期结果
let currentDateTime = new Date(); // 当前系统时间

// DOM 元素
const deviceFileInput = document.getElementById('deviceFile');
const orderFileInput = document.getElementById('orderFile');
const deviceFileNameDisplay = document.getElementById('deviceFileName');
const orderFileNameDisplay = document.getElementById('orderFileName');
const uploadBtn = document.getElementById('uploadBtn');
const uploadToggleBtn = document.getElementById('uploadToggleBtn');
const closeUploadBtn = document.getElementById('closeUploadBtn');
const uploadPanel = document.getElementById('uploadPanel');
const processingSection = document.getElementById('processingSection');
const filterSection = document.getElementById('filterSection');
const resultsSection = document.getElementById('resultsSection');
const dataSummarySection = document.getElementById('dataSummarySection');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');
const filterBtn = document.getElementById('filterBtn');
const resetFilterBtn = document.getElementById('resetFilterBtn');
const deviceTypeFilter = document.getElementById('deviceTypeFilter');
const tabBtns = document.querySelectorAll('.tab-btn');

// 数据摘要元素
const orderDataCount = document.getElementById('orderDataCount');
const orderDataDetails = document.getElementById('orderDataDetails');
const deviceDataCount = document.getElementById('deviceDataCount');
const deviceDataDetails = document.getElementById('deviceDataDetails');
const scheduleResultCount = document.getElementById('scheduleResultCount');
const scheduleResultDetails = document.getElementById('scheduleResultDetails');

// 文件状态
let deviceFilesUploaded = false;
let orderFilesUploaded = false;

// 初始化函数
function init() {
    // 文件上传事件监听
    deviceFileInput.addEventListener('change', handleDeviceFileChange);
    orderFileInput.addEventListener('change', handleOrderFileChange);
    uploadBtn.addEventListener('click', handleFileUpload);
    
    // 上传面板切换
    uploadToggleBtn.addEventListener('click', toggleUploadPanel);
    closeUploadBtn.addEventListener('click', closeUploadPanel);
    document.addEventListener('click', function(event) {
        if (!uploadPanel.contains(event.target) && event.target !== uploadToggleBtn) {
            closeUploadPanel();
        }
    });
    
    // 过滤器事件监听
    filterBtn.addEventListener('click', applyFilters);
    resetFilterBtn.addEventListener('click', resetFilters);
    
    // 标签页切换监听
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // 初始状态下禁用上传按钮
    updateUploadButtonState();
}

// 处理设备数据文件改变
function handleDeviceFileChange(event) {
    const files = event.target.files;
    if (files.length > 0) {
        const fileNames = Array.from(files).map(file => file.name).join(', ');
        deviceFileNameDisplay.textContent = fileNames;
        deviceFilesUploaded = true;
    } else {
        deviceFileNameDisplay.textContent = '未选择设备文件';
        deviceFilesUploaded = false;
    }
    updateUploadButtonState();
}

// 处理委托数据文件改变
function handleOrderFileChange(event) {
    const files = event.target.files;
    if (files.length > 0) {
        const fileNames = Array.from(files).map(file => file.name).join(', ');
        orderFileNameDisplay.textContent = fileNames;
        orderFilesUploaded = true;
    } else {
        orderFileNameDisplay.textContent = '未选择委托文件';
        orderFilesUploaded = false;
    }
    updateUploadButtonState();
}

// 切换上传面板显示/隐藏
function toggleUploadPanel() {
    uploadPanel.classList.toggle('show');
}

// 关闭上传面板
function closeUploadPanel() {
    uploadPanel.classList.remove('show');
}

// 更新上传按钮状态
function updateUploadButtonState() {
    // 只有当至少一种文件被上传时才启用按钮
    uploadBtn.disabled = !(deviceFilesUploaded || orderFilesUploaded);
    if (!(deviceFilesUploaded || orderFilesUploaded)) {
        uploadBtn.classList.add('disabled');
    } else {
        uploadBtn.classList.remove('disabled');
    }
}

// 文件上传处理
function handleFileUpload() {
    // 检查是否至少选择了一个文件
    if (!deviceFilesUploaded && !orderFilesUploaded) {
        showError('请至少选择一个设备数据文件或委托数据文件');
        return;
    }
    
    // 关闭上传面板
    closeUploadPanel();
    
    // 显示处理中状态
    hideAllSections();
    processingSection.style.display = 'block';
    
    // 重置处理步骤状态
    resetProcessingSteps();
    
    // 更新读取文件步骤状态
    updateStepStatus('reading', 'pending', '正在读取文件...');
    
    // 处理设备数据文件
    const deviceFiles = deviceFilesUploaded ? Array.from(deviceFileInput.files) : [];
    const orderFiles = orderFilesUploaded ? Array.from(orderFileInput.files) : [];
    
    // 分别处理设备和委托数据文件
    const devicePromises = deviceFiles.map(file => {
        return readExcelFile(file).then(data => {
            return { type: 'device', data };
        });
    });
    
    const orderPromises = orderFiles.map(file => {
        return readExcelFile(file).then(data => {
            return { type: 'order', data };
        });
    });
    
    // 合并所有Promise
    Promise.all([...devicePromises, ...orderPromises])
        .then(results => {
            try {
                // 处理设备数据
                let deviceFileData = [];
                let orderFileData = [];
                
                // 根据类型分离数据
                results.forEach(result => {
                    if (result.type === 'device') {
                        deviceFileData = deviceFileData.concat(result.data);
                    } else if (result.type === 'order') {
                        orderFileData = orderFileData.concat(result.data);
                    }
                });
                
                // 完成读取文件步骤
                updateStepStatus('reading', 'complete', '文件读取完成');
                
                // 输出原始数据样例，帮助调试
                if (orderFileData.length > 0) {
                    console.log("委托数据首条记录样例:", orderFileData[0]);
                }
                
                // 处理设备数据
                updateStepStatus('device-data', 'pending', '正在处理设备数据...');
                if (deviceFileData.length > 0) {
                    deviceData = cleanDeviceData(deviceFileData);
                    updateStepStatus('device-data', 'complete', `成功处理 ${deviceData.length} 条设备数据`);
                } else {
                    updateStepStatus('device-data', 'error', '未找到设备数据');
                }
                
                // 处理委托数据
                updateStepStatus('order-data', 'pending', '正在处理委托数据...');
                if (orderFileData.length > 0) {
                    orderData = cleanOrderData(orderFileData);
                    
                    // 统计缺少测试时长的订单数
                    const missingDurations = orderData.filter(item => item.testDuration === null).length;
                    
                    if (missingDurations > 0) {
                        updateStepStatus('order-data', 'complete', 
                            `成功处理 ${orderData.length} 条委托数据（其中 ${missingDurations} 条缺少测试时长）`);
                    } else {
                        updateStepStatus('order-data', 'complete', `成功处理 ${orderData.length} 条委托数据`);
                    }
                } else {
                    updateStepStatus('order-data', 'error', '未找到委托数据');
                }
                
                // 检查是否有足够的数据进行排期
                if (deviceData.length === 0) {
                    throw new Error('缺少设备数据，请上传包含设备数据的文件');
                }
                
                if (orderData.length === 0) {
                    throw new Error('缺少委托数据，请上传包含委托数据的文件');
                }
                
                // 执行排期算法
                updateStepStatus('scheduling', 'pending', '正在执行排期算法...');
                console.log('开始调用排期算法...');
                scheduleResults = geneticScheduling(orderData, deviceData);
                console.log('排期算法执行完成，开始处理结果展示...');
                
                // 计算排期成功率
                const validOrders = orderData.filter(item => item.testDuration !== null && item.testDuration > 0);
                const successCount = scheduleResults.filter(item => item.status === '已排期' || item.status === '已迁移').length;
                const successRate = (successCount / validOrders.length * 100).toFixed(1);
                
                updateStepStatus('scheduling', 'complete', `排期完成，成功率: ${successRate}%`);
                
                // 更新设备类型过滤器选项
                updateDeviceTypeFilter();
                
                // 展示数据处理摘要
                updateDataSummary();
                
                // 显示结果区域
                hideAllSections();
                filterSection.style.display = 'block';
                resultsSection.style.display = 'block';
                dataSummarySection.style.display = 'block';
                
                // 渲染结果
                renderResults(scheduleResults);
                
            } catch (error) {
                console.error('处理数据时出错:', error);
                updateProcessingStatus('失败');
                showError(error.message);
            }
        })
        .catch(error => {
            console.error('文件读取失败:', error);
            updateProcessingStatus('失败');
            showError(`文件读取失败: ${error.message}`);
        });
}

// 更新数据处理摘要
function updateDataSummary() {
    // 委托数据摘要
    orderDataCount.textContent = `${orderData.length} 条记录`;
    const missingDurations = orderData.filter(item => item.testDuration === null).length;
    orderDataDetails.textContent = missingDurations > 0 ? 
        `其中 ${missingDurations} 条记录缺少测试时长` : 
        '全部记录都包含有效的测试时长';
    
    // 设备数据摘要
    deviceDataCount.textContent = `${deviceData.length} 条记录`;
    const deviceTypes = [...new Set(deviceData.map(item => item.deviceType))];
    deviceDataDetails.textContent = `共有 ${deviceTypes.length} 种设备类型`;
    
    // 排期结果摘要
    const scheduledCount = scheduleResults.filter(item => item.status === '已排期').length;
    const overdueCount = scheduleResults.filter(item => item.status === '超出完成时间').length;
    const errorCount = scheduleResults.filter(item => item.status !== '已排期' && item.status !== '超出完成时间').length;
    
    scheduleResultCount.textContent = `${scheduleResults.length} 条记录`;
    scheduleResultDetails.textContent = `已排期: ${scheduledCount}, 超出完成时间: ${overdueCount}, 问题记录: ${errorCount}`;
}

// 重置处理步骤状态
function resetProcessingSteps() {
    const steps = ['reading', 'device-data', 'order-data', 'scheduling'];
    steps.forEach(step => {
        const stepElement = document.getElementById(`step-${step}`);
        if (stepElement) {
            stepElement.className = 'step';
            stepElement.querySelector('.step-status').textContent = '⏳';
            stepElement.querySelector('.step-detail').textContent = '';
        }
    });
}

// 更新步骤状态
function updateStepStatus(step, status, message) {
    const stepElement = document.getElementById(`step-${step}`);
    if (!stepElement) return;
    
    // 更新类名
    stepElement.className = `step ${status}`;
    
    // 更新状态图标
    const statusElement = stepElement.querySelector('.step-status');
    if (statusElement) {
        switch (status) {
            case 'pending':
                statusElement.textContent = '⏳';
                break;
            case 'complete':
                statusElement.textContent = '✅';
                break;
            case 'error':
                statusElement.textContent = '❌';
                break;
            default:
                statusElement.textContent = '⏳';
        }
    }
    
    // 更新详情消息
    const detailElement = stepElement.querySelector('.step-detail');
    if (detailElement) {
        detailElement.textContent = message || '';
    }
    
    // 同时更新总体处理状态
    updateProcessingStatus(message);
}

// 更新处理状态
function updateProcessingStatus(message) {
    const statusElem = document.querySelector('.processing-indicator p');
    if (statusElem) {
        statusElem.textContent = message;
    }
    console.log('处理状态:', message);
}

// 读取Excel文件
function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // 检查是否有工作表
                if (workbook.SheetNames.length === 0) {
                    throw new Error('Excel文件不包含任何工作表');
                }
                
                // 转换Excel文件时保留原始类型
                const options = { 
                    raw: false,  // 不转换日期
                    defval: '',  // 默认空值
                    header: 'A'  // 使用字母表头
                };
                
                // 尝试分析所有工作表，找到最可能包含有效数据的工作表
                const sheetData = [];
                for (const sheetName of workbook.SheetNames) {
                    const sheet = workbook.Sheets[sheetName];
                    
                    // 获取表头
                    let headerRow = null;
                    let startRow = 0;
                    
                    // 寻找表头行
                    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
                    for (let r = range.s.r; r <= range.e.r; r++) {
                        let isHeaderRow = true;
                        let nonEmptyCount = 0;
                        
                        // 检查这一行是否可能是表头（不含空单元格且有多个单元格）
                        for (let c = range.s.c; c <= range.e.c; c++) {
                            const cellRef = XLSX.utils.encode_cell({r, c});
                            const cell = sheet[cellRef];
                            if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
                                nonEmptyCount++;
                            }
                        }
                        
                        if (nonEmptyCount >= 3) {  // 至少3个非空单元格才可能是表头
                            headerRow = r;
                            startRow = r + 1;  // 数据从表头下一行开始
                            break;
                        }
                    }
                    
                    // 如果找到表头，则提取表头信息
                    const headers = [];
                    if (headerRow !== null) {
                        for (let c = range.s.c; c <= range.e.c; c++) {
                            const cellRef = XLSX.utils.encode_cell({r: headerRow, c});
                            const cell = sheet[cellRef];
                            headers[c] = cell ? String(cell.v).trim() : '';
                        }
                        
                        console.log(`工作表 ${sheetName} 表头:`, headers);
                        
                        // 读取数据行
                        for (let r = startRow; r <= range.e.r; r++) {
                            const rowData = {};
                            let hasData = false;
                            
                            for (let c = range.s.c; c <= range.e.c; c++) {
                                if (!headers[c]) continue;  // 跳过无表头的列
                                
                                const cellRef = XLSX.utils.encode_cell({r, c});
                                const cell = sheet[cellRef];
                                
                                if (cell) {
                                    // 根据单元格类型正确转换值
                                    let value = cell.v;
                                    
                                    // 特殊处理"测试时长"字段
                                    if (headers[c] === '测试时长' && cell.t === 'n') {
                                        // 确保数值类型保持为数字
                                        value = Number(value);
                                    }
                                    
                                    rowData[headers[c]] = value;
                                    hasData = true;
                                } else {
                                    rowData[headers[c]] = '';
                                }
                            }
                            
                            if (hasData) {
                                sheetData.push(rowData);
                            }
                        }
                    } else {
                        // 如果没找到表头，使用传统方式转换
                        const data = XLSX.utils.sheet_to_json(sheet);
                        if (data.length > 0) {
                            sheetData.push(...data);
                        }
                    }
                }
                
                if (sheetData.length === 0) {
                    throw new Error('未找到有效数据');
                }
                
                console.log(`Excel文件读取完成，共 ${sheetData.length} 条记录`);
                resolve(sheetData);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = function() {
            reject(new Error('文件读取失败'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// 清洗委托数据
function cleanOrderData(rawData) {
    console.log("正在清洗订单数据...");
    
    // 设置关键字段的可能名称
    const deviceTypeFields = ['设备类型', '设备型号', '设备', '型号', 'device type', 'model', 'device model'];
    const deviceIdFields = ['设备编号', '设备ID', '编号', 'ID', 'device id', 'device number'];
    const dateFields = ['收样日期', '送样日期', '接收日期', '开始日期', '日期', 'start date', 'receive date', 'date'];
    const requiredDateFields = ['要求完成时间（年/月/日）', '要求完成日期', '预期完成日期', '截止日期', 'deadline', 'due date', 'target date'];
    const testDurationFields = ['测试时长', '测试时间', '时长', '小时', '工时', 'duration', 'test duration', 'hours', 'test hours'];
    const orderNumberFields = ['委托单号', '订单号', '编号', '工单号', 'order number', 'order id'];
    
    // 增加更多字段的可能名称
    const organizationFields = ['委托单位', '单位', '企业', '公司', '委托方', 'organization', 'company', 'client company'];
    const clientNameFields = ['委托人', '联系人', '客户', '客户名称', 'client', 'contact person', 'customer'];
    const projectNameFields = ['项目名称', '项目', '检测项目', '测试项目', 'project name', 'project', 'test name'];
    const projectIdFields = ['项目编号', '项目ID', '项目代码', 'project id', 'project number', 'project code'];
    const sampleNameFields = ['样件名称', '样品名称', '材料名称', '测试样品', 'sample name', 'material name', 'specimen'];
    
    // 打印原始数据的字段名，用于调试
    if (rawData.length > 0) {
        console.log("原始数据的所有字段名:", Object.keys(rawData[0]));
    }
    
    let cleanedData = rawData.map((item, index) => {
        // 通过处理函数提取基本字段
        const result = processOrder(
            item, 
            deviceTypeFields, 
            deviceIdFields, 
            dateFields, 
            requiredDateFields, 
            testDurationFields,
            orderNumberFields
        );
        
        // 额外提取更多字段
        result.organization = extractField(item, organizationFields);
        result.clientName = extractField(item, clientNameFields);
        result.projectName = extractField(item, projectNameFields);
        result.projectId = extractField(item, projectIdFields);
        result.sampleName = extractField(item, sampleNameFields);
        
        // 确保每条记录都有唯一的orderId和有意义的委托单号
        if (!result.orderNumber) {
            // 如果没有提取到委托单号，使用索引生成一个
            result.orderNumber = `委托-${String(index + 1).padStart(3, '0')}`;
        }
        
        // 确保orderId字段有值，用于系统内部标识
        result.orderId = result.orderNumber || `order-${index}`;
        
        // 调试输出所有提取的字段
        console.log(`订单 ${result.orderNumber} 提取的额外字段:`, {
            organization: result.organization,
            clientName: result.clientName,
            projectName: result.projectName,
            projectId: result.projectId,
            sampleName: result.sampleName
        });
        
        return result;
    });
    
    // 统计有多少条记录缺少测试时长
    const missingDuration = cleanedData.filter(item => item.testDuration === null).length;
    
    console.log(`订单数据清洗完成，共处理 ${cleanedData.length} 条记录，其中 ${missingDuration} 条缺少测试时长`);
    
    return cleanedData;
}

// 提取测试时长字段的专用函数
function extractTestDuration(item, testDurationFields) {
    console.log("尝试提取测试时长字段，可能的字段名:", testDurationFields);
    console.log("数据项中的所有字段名:", Object.keys(item));
    
    // 直接检查是否存在"测试时长"字段（精确匹配）
    if ("测试时长" in item) {
        console.log(`找到精确匹配的测试时长字段: 测试时长 = ${item["测试时长"]}`);
        return item["测试时长"];
    }
    
    // 首先通过常规方法查找
    let testDuration = extractField(item, testDurationFields);
    
    // 输出测试时长相关信息以便调试
    console.log(`尝试提取测试时长 - 方法1结果:`, testDuration);
    
    // 如果未找到，尝试查找带括号的字段
    if (testDuration === null || testDuration === undefined) {
        // 遍历所有键名
        const keys = Object.keys(item);
        for (const key of keys) {
            // 查找包含"测试时长"和括号的字段
            if ((key.includes('测试') && key.includes('时长') && (key.includes('(') || key.includes('（'))) ||
                (key.toLowerCase().includes('test') && key.toLowerCase().includes('duration') && 
                 (key.includes('(') || key.includes('（')))) {
                console.log(`找到带括号的测试时长字段: ${key}`);
                testDuration = item[key];
                break;
            }
        }
        console.log(`尝试提取测试时长 - 方法2结果:`, testDuration);
    }
    
    // 如果仍未找到，尝试基于值类型识别合适的字段
    if (testDuration === null || testDuration === undefined) {
        const keys = Object.keys(item);
        for (const key of keys) {
            const value = item[key];
            const keyLower = key.toLowerCase();
            
            // 先检查字段名是否完全匹配（不区分大小写）
            if (keyLower === "测试时长" || keyLower === "testduration" || 
                keyLower === "test duration" || keyLower === "duration") {
                console.log(`找到不区分大小写匹配的测试时长字段: ${key} = ${value}`);
                testDuration = value;
                break;
            }
            
            // 检查是否是与时间相关的字段名
            const isTimeRelatedKey = key.includes('时长') || key.includes('小时') || 
                                     keyLower.includes('hour') || keyLower.includes('duration');
            
            // 如果字段值是数字且在合理范围内(1-240小时)，或者是可解析为数字的字符串
            if (((typeof value === 'number') || 
                 (typeof value === 'string' && !isNaN(parseFloat(value)))) && 
                parseFloat(value) > 0 && parseFloat(value) <= 240) {
                
                // 如果字段名包含时间相关关键词，则更可能是测试时长
                if (isTimeRelatedKey) {
                    console.log(`根据字段名和值类型找到测试时长字段: ${key} = ${value}`);
                    testDuration = value;
                    break;
                }
                
                // 如果没有更好的候选，使用这个值
                if (testDuration === null || testDuration === undefined) {
                    console.log(`尝试根据值类型推断测试时长字段: ${key} = ${value}`);
                    testDuration = value;
                    // 不立即退出循环，因为可能有更好的匹配
                }
            }
        }
        console.log(`尝试提取测试时长 - 方法3结果:`, testDuration);
    }
    
    // 如果是字符串类型的测试时长，处理它
    if (testDuration !== null && testDuration !== undefined && typeof testDuration === 'string') {
        // 移除非数字字符并解析为浮点数
        const numericValue = testDuration.replace(/[^\d.]/g, '');
        if (numericValue !== '') {
            testDuration = parseFloat(numericValue);
            console.log(`将字符串测试时长 "${testDuration}" 转换为数字: ${testDuration}`);
        } else {
            console.warn(`警告: 无法从字符串 "${testDuration}" 提取数字`);
            testDuration = null;
        }
    }
    
    return testDuration;
}

// 处理单个订单
function processOrder(
    item, 
    deviceTypeFields, 
    deviceIdFields, 
    dateFields, 
    requiredDateFields, 
    testDurationFields,
    orderNumberFields
) {
    // 提取关键字段
    let deviceType = extractField(item, deviceTypeFields);
    let deviceId = extractField(item, deviceIdFields);
    let startDate = extractDate(extractField(item, dateFields));
    let requiredDate = extractDate(extractField(item, requiredDateFields));
    let testDuration = extractTestDuration(item, testDurationFields);
    let orderNumber = extractField(item, orderNumberFields);
    
    // 确保测试时长为数字（如果存在）
    if (testDuration !== null && testDuration !== undefined) {
        if (typeof testDuration === 'string') {
            // 移除非数字字符并解析为浮点数
            testDuration = testDuration.replace(/[^\d.]/g, '');
            testDuration = parseFloat(testDuration);
        }
        
        if (isNaN(testDuration)) {
            console.warn(`警告: 无法解析测试时长 "${testDuration}" 为有效数字`);
            testDuration = null;
        }
    }
    
    // 用户要求不使用系统估算的测试时长，所以如果提取不到有效值，就保留为null
    if (testDuration === null || testDuration === undefined || testDuration <= 0) {
        console.warn(`警告: 订单 ${orderNumber || "未知"} 缺少有效的测试时长数据`);
        testDuration = null;
    } else {
        console.log(`使用提取的测试时长: ${testDuration}小时`);
    }
    
    // 确保日期时间部分为00:00
    if (startDate) {
        startDate.setHours(0, 0, 0, 0);
    }
    
    if (requiredDate) {
        requiredDate.setHours(0, 0, 0, 0);
    }
    
    // 记录缺失的日期信息，但不强制设置默认值
    if (!startDate) {
        console.warn("警告: 缺少起始日期，将在排期算法中处理");
    }
    
    if (!requiredDate) {
        console.warn("警告: 缺少要求完成日期，将在排期算法中处理");
    }
    
    // 检查时间悖论（如果有完整日期）
    let status = null;
    if (startDate && requiredDate && startDate > requiredDate) {
        status = '时间悖论错误';
        console.error(`时间悖论错误: 收样日期 ${formatDate(startDate)} 晚于要求完成日期 ${formatDate(requiredDate)}`);
    }
    
    // 标记缺少测试时长的订单
    if (testDuration === null) {
        status = '缺少测试时长';
    }
    
    // 样本数据质量验证
    let dataQuality = calculateDataQuality(item, deviceType, deviceId, startDate, requiredDate, testDuration);
    
    return {
        deviceType: deviceType || "未知设备",
        deviceId: deviceId || `未知设备${Math.floor(Math.random() * 1000)}`,
        startDate: startDate,
        requiredDate: requiredDate,
        testDuration: testDuration,
        orderNumber: orderNumber,
        originalData: item,
        dataQuality: dataQuality,
        status: status
    };
}

// 清洗设备数据
function cleanDeviceData(rawData) {
    console.log("正在清洗设备数据...");
    console.log("原始设备数据项数:", rawData.length);
    
    // 记录被找到的字段名，以便调试
    let foundDeviceIdFields = [];
    let foundDeviceTypeFields = [];
    let foundLoadFields = [];
    
        // 尝试识别各种可能的字段名称
    // 设备编号可能的字段名 - 增加更多可能的匹配名称
    const deviceIdFields = ['设备编号', '设备ID', '设备编码', '编号', '设备代码', '设备序号', 'deviceId', 'id', 'code', 'equipment id', 'equipment number'];
    // 设备类别可能的字段名 - 增加更多可能的匹配名称
    const deviceTypeFields = ['设备类别', '设备类型', '设备', '类型', '类别', '设备名称', 'deviceType', 'type', 'equipment type', 'category'];
        // 历史负载率可能的字段名
    const loadFields = ['历史负载率', '负载率', '负载', '使用率', 'load', 'historicalLoad', 'usageRate', 'utilization'];
    
    // 输出原始数据的字段名
    if (rawData.length > 0) {
        console.log("设备数据原始字段名:", Object.keys(rawData[0]));
    }
    
    const cleanedData = rawData.map((item, index) => {
        // 尝试识别设备编号字段
        const deviceIdField = findField(item, deviceIdFields);
        if (deviceIdField && !foundDeviceIdFields.includes(deviceIdField)) {
            foundDeviceIdFields.push(deviceIdField);
        }
        
        // 尝试识别设备类型字段
        const deviceTypeField = findField(item, deviceTypeFields);
        if (deviceTypeField && !foundDeviceTypeFields.includes(deviceTypeField)) {
            foundDeviceTypeFields.push(deviceTypeField);
        }
        
        // 尝试识别负载率字段
        const loadField = findField(item, loadFields);
        if (loadField && !foundLoadFields.includes(loadField)) {
            foundLoadFields.push(loadField);
        }

        // 提取字段值
        const deviceId = deviceIdField ? String(item[deviceIdField]).trim() : null;
        const deviceType = deviceTypeField ? String(item[deviceTypeField]).trim() : null;
        
        // 特殊处理负载率字段
        let historicalLoad = null;
        if (loadField) {
            const loadValue = item[loadField];
            if (typeof loadValue === 'number') {
                historicalLoad = loadValue;
            } else if (typeof loadValue === 'string') {
                // 尝试提取字符串中的数字
                const match = loadValue.match(/[0-9.]+/);
                if (match) {
                    historicalLoad = parseFloat(match[0]) / 100; // 如果是百分比格式，转换为小数
                }
            }
        }
        
        // 设置默认负载率
        if (historicalLoad === null || isNaN(historicalLoad)) {
            historicalLoad = 0.5; // 默认负载为50%
        }
        
        // 验证设备ID是否像委托编号（防止误识别）
        let isValidDeviceId = true;
        if (deviceId) {
            // 检查是否具有委托单号的特征（如SH+数字格式）
            if (/^[A-Za-z]{2}\d{6,}$/i.test(deviceId)) {
                console.warn(`警告：设备ID "${deviceId}" 疑似委托单号，可能是识别错误`);
                isValidDeviceId = false;
            }
            
            // 验证典型的设备编号格式（包含字母和短横线）
            if (!deviceId.includes('-') && !/[A-Za-z]/.test(deviceId)) {
                console.warn(`警告：设备ID "${deviceId}" 不符合常见设备编号格式`);
            }
        }

        return {
            deviceId: isValidDeviceId && deviceId ? deviceId : `设备-${Math.random().toString(36).substring(2, 6)}`,
            deviceType: deviceType || '未指定',
            historicalLoad: historicalLoad,
            originalData: item, // 保存原始数据以供参考
            history: [],
            dataQuality: calculateDataQuality(deviceId, deviceType, historicalLoad),
            isValidDeviceId: isValidDeviceId
        };
    });
    
    // 记录找到的字段名
    console.log("找到的设备编号字段:", foundDeviceIdFields);
    console.log("找到的设备类型字段:", foundDeviceTypeFields);
    console.log("找到的负载率字段:", foundLoadFields);
    
    // 检查是否有设备类型相同但设备ID不同的情况
    const deviceTypeMap = {};
    cleanedData.forEach(device => {
        if (!deviceTypeMap[device.deviceType]) {
            deviceTypeMap[device.deviceType] = [];
        }
        // 只有验证通过的设备ID才添加到映射中
        if (device.isValidDeviceId) {
            deviceTypeMap[device.deviceType].push(device.deviceId);
        }
    });
    
    // 输出每种设备类型有多少台设备
    for (const [type, devices] of Object.entries(deviceTypeMap)) {
        console.log(`设备类型 ${type} 有 ${devices.length} 台设备: ${devices.join(', ')}`);
    }
    
    // 过滤掉无效的设备记录
    const filteredData = cleanedData.filter(item => {
        // 过滤无设备类别或数据质量过低的记录
        const isValid = item.deviceType !== '未指定' && item.dataQuality > 0.3 && item.isValidDeviceId;
        if (!isValid) {
            console.warn(`过滤掉无效的设备记录: ${JSON.stringify(item)}`);
        }
        return isValid;
    });
    
    console.log(`设备数据清洗完成，从 ${rawData.length} 条原始记录中识别出 ${filteredData.length} 台有效设备`);
    return filteredData;
}

// 查找字段名函数
function findField(item, possibleFields) {
    if (!item) return null;
    
    // 获取原始键列表
    const originalKeys = Object.keys(item);
    
    // 特殊处理: 首先直接尝试常见的精确字段名
    for (const field of possibleFields) {
        if (field in item) {
            console.log(`精确匹配到字段: ${field}`);
            return field;
        }
    }
    
    // 标准化对象键与可能的字段进行比较
    const normalizedKeys = originalKeys.map(key => key.toLowerCase().replace(/[（）\(\)\[\]{}]/g, '').trim());
    
    // 调试输出
    console.log("查找字段，可能的字段名:", possibleFields);
    console.log("原始键名:", originalKeys);
    console.log("标准化后的键名:", normalizedKeys);
    
    // 寻找不区分大小写的精确匹配
    for (const field of possibleFields) {
        const fieldLower = field.toLowerCase().replace(/[（）\(\)\[\]{}]/g, '').trim();
        
        for (let i = 0; i < originalKeys.length; i++) {
            const originalKey = originalKeys[i];
            const normalizedKey = normalizedKeys[i];
            
            // 完全匹配(忽略大小写和特殊字符)
            if (normalizedKey === fieldLower) {
                console.log(`找到忽略大小写和特殊字符的精确匹配字段: ${originalKey}`);
                return originalKey;
            }
        }
    }
    
    // 处理括号变体
    for (const field of possibleFields) {
        const normalizedField = field.replace(/[（）\(\)\[\]{}]/g, '').trim();
        
        // 常见的括号变体
        const withParentheses = [
            `${normalizedField}(小时)`, 
            `${normalizedField}（小时）`, 
            `${normalizedField}(h)`,
            `${normalizedField}（h）`,
            `${normalizedField}(hour)`,
            `${normalizedField}（hour）`,
            `${normalizedField}(小时数)`,
            `${normalizedField}（小时数）`
        ];
        
        for (const variant of withParentheses) {
            if (variant in item) {
                console.log(`找到带括号的变体字段: ${variant}`);
                return variant;
            }
        }
    }
    
    // 设备编号的特殊处理
    if (possibleFields.includes('设备编号') || possibleFields.includes('deviceId')) {
        for (const key of originalKeys) {
            const keyLower = key.toLowerCase();
            
            // 特别精确匹配设备编号相关字段
            if (keyLower === '设备编号' || keyLower === 'deviceid' || 
                keyLower === 'device id' || keyLower === 'equipment id' ||
                keyLower === 'equipment number') {
                console.log(`找到设备编号特殊匹配字段: ${key}`);
                return key;
            }
            
            // 检查是否包含典型的设备编号关键词
            if ((key.includes('设备') && key.includes('编号')) || 
                (keyLower.includes('device') && keyLower.includes('id')) ||
                (keyLower.includes('equipment') && keyLower.includes('id')) ||
                (keyLower.includes('equipment') && keyLower.includes('number'))) {
                console.log(`找到设备编号关键词匹配字段: ${key}`);
                return key;
            }
        }
    }
    
    // 设备类型的特殊处理
    if (possibleFields.includes('设备类型') || possibleFields.includes('设备类别') || possibleFields.includes('deviceType')) {
        for (const key of originalKeys) {
            const keyLower = key.toLowerCase();
            
            // 特别精确匹配设备类型相关字段
            if (keyLower === '设备类型' || keyLower === '设备类别' || 
                keyLower === 'devicetype' || keyLower === 'device type' ||
                keyLower === 'equipment type' || keyLower === 'category') {
                console.log(`找到设备类型特殊匹配字段: ${key}`);
                return key;
            }
            
            // 检查是否包含典型的设备类型关键词
            if ((key.includes('设备') && (key.includes('类型') || key.includes('类别'))) || 
                (keyLower.includes('device') && keyLower.includes('type')) ||
                (keyLower.includes('equipment') && keyLower.includes('type')) ||
                (keyLower.includes('equipment') && keyLower.includes('category'))) {
                console.log(`找到设备类型关键词匹配字段: ${key}`);
                return key;
            }
        }
    }
    
    // 通用部分匹配 - 寻找包含关键词的字段
    for (const field of possibleFields) {
        const fieldLower = field.toLowerCase().replace(/[（）\(\)\[\]{}]/g, '').trim();
        
        // 首先检查包含完整关键词的字段
            for (let i = 0; i < originalKeys.length; i++) {
            const originalKey = originalKeys[i];
            const normalizedKey = normalizedKeys[i];
            
            if (normalizedKey.includes(fieldLower) || fieldLower.includes(normalizedKey)) {
                console.log(`找到包含关键词的字段: ${originalKey}`);
                return originalKey;
            }
        }
    }
    
    // 如果还是没找到，使用基于值类型和字段名特征的启发式方法
    
    // 设备编号特征：通常包含字母和数字组合，可能有连字符
    if (possibleFields.includes('设备编号') || possibleFields.includes('deviceId')) {
        for (let i = 0; i < originalKeys.length; i++) {
            const key = originalKeys[i];
            const value = item[key];
            
            if (typeof value === 'string') {
                // 典型的设备编号格式：包含字母和数字，可能有连字符
                if (value.includes('-') && /[A-Za-z]/.test(value) && /\d/.test(value)) {
                    // 避免误识别委托单号 (如 SH202304110)
                    if (!/^[A-Za-z]{2}\d{6,}$/.test(value)) {
                        console.log(`根据值格式特征找到可能的设备编号字段: ${key} = ${value}`);
                return key;
            }
                }
            }
        }
    }
    
    // 设备类型特征：通常是描述性字符串，如"高温设备"、"低温设备"等
    if (possibleFields.includes('设备类型') || possibleFields.includes('设备类别') || possibleFields.includes('deviceType')) {
        for (let i = 0; i < originalKeys.length; i++) {
            const key = originalKeys[i];
            const value = item[key];
            
            if (typeof value === 'string' && value.length > 1) {
                // 设备类型通常包含"设备"、"箱"、"仪"等关键词
                if (value.includes('设备') || value.includes('箱') || 
                    value.includes('仪') || value.includes('试验') ||
                    value.toLowerCase().includes('test') || 
                    value.toLowerCase().includes('equipment')) {
                    console.log(`根据值内容特征找到可能的设备类型字段: ${key} = ${value}`);
                    return key;
                }
            }
        }
    }
    
    // 负载率特征：通常是小于1的浮点数或百分比
    if (possibleFields.includes('负载率') || possibleFields.includes('historicalLoad')) {
        for (let i = 0; i < originalKeys.length; i++) {
            const key = originalKeys[i];
            const value = item[key];
            
            // 数字类型且在0-1之间，或具有%的字符串
            if ((typeof value === 'number' && value >= 0 && value <= 1) || 
                (typeof value === 'string' && value.includes('%'))) {
                console.log(`根据值范围特征找到可能的负载率字段: ${key} = ${value}`);
                return key;
            }
        }
    }
    
    return null;
}

// 计算数据质量分数
function calculateDataQuality(...fields) {
    // 计算非空字段的比例
    const nonNullFields = fields.filter(field => field !== null && field !== undefined);
    return nonNullFields.length / fields.length;
}

// 从对象中提取字段
function extractField(item, possibleFields) {
    // 使用findField函数查找匹配的字段名
    const fieldName = findField(item, possibleFields);
    
    // 如果找到匹配的字段名，返回对应的值
    if (fieldName) {
        return item[fieldName];
    }
    
    // 未找到匹配的字段，返回null
    return null;
}

// 提取并转换日期字段
function extractDate(dateValue) {
    if (!dateValue) return null;
    
    // 如果是日期对象，直接返回，但时间设置为00:00
    if (dateValue instanceof Date) {
        const date = new Date(dateValue);
        date.setHours(0, 0, 0, 0);
        return date;
    }
    
    // 如果是数字或字符串，尝试使用parseExcelDate解析
    return parseExcelDate(dateValue);
}

// 解析Excel日期
function parseExcelDate(excelDate) {
    if (!excelDate) return null;
    
    // 如果是Excel序列号日期
    if (typeof excelDate === 'number') {
        // Excel中的日期是从1900年1月0日开始的天数
        const date = new Date((excelDate - 25569) * 86400 * 1000);
        date.setHours(0, 0, 0, 0);
        return date;
    }
    
    // 如果是字符串格式的日期
    if (typeof excelDate === 'string') {
        const date = new Date(excelDate);
        if (isNaN(date.getTime())) {
            return null;
        }
        date.setHours(0, 0, 0, 0);
        return date;
    }
    
    return null;
}

// 基于遗传算法的调度
function geneticScheduling(orders, devices) {
    if (!orders || orders.length === 0 || !devices || devices.length === 0) {
        console.log('没有有效的订单或设备数据进行调度');
        return [];
    }

    // 过滤出有效的订单（包含有效的测试时长）
    const validOrders = orders.filter(order => {
        const testDuration = parseFloat(order.testDuration);
        return !isNaN(testDuration) && testDuration > 0;
    });
    
    const invalidOrders = orders.filter(order => {
        const testDuration = parseFloat(order.testDuration);
        return isNaN(testDuration) || testDuration <= 0;
    });
    
    console.log(`有效订单数: ${validOrders.length}, 无效订单数: ${invalidOrders.length}`);
    
    // 找出最早的收样日期和最晚的要求完成时间
    let earliestSampleDate = null;
    let latestRequiredDate = null;
    
    validOrders.forEach(order => {
        if (order.startDate && (!earliestSampleDate || order.startDate < earliestSampleDate)) {
            earliestSampleDate = new Date(order.startDate);
        }
        
        if (order.requiredDate && (!latestRequiredDate || order.requiredDate > latestRequiredDate)) {
            latestRequiredDate = new Date(order.requiredDate);
        }
    });
    
    // 将缺失日期的订单设置为默认值
    validOrders.forEach(order => {
        if (!order.startDate) {
            // 如果收样日期缺失，默认为当前日期
            order.startDate = new Date();
            console.log(`订单 ${order.orderNumber || order.orderId} 缺少收样日期，已设为当前日期`);
        }
        
        if (!order.requiredDate) {
            // 如果要求完成时间缺失，默认为收样日期加上一个月
            const requiredDate = new Date(order.startDate);
            requiredDate.setMonth(requiredDate.getMonth() + 1);
            order.requiredDate = requiredDate;
            console.log(`订单 ${order.orderNumber || order.orderId} 缺少要求完成时间，已设为收样日期后一个月`);
        }
        
        // 确保设备类型有值
        if (!order.deviceType || order.deviceType === '未知设备类型' || order.deviceType === '未分配') {
            // 设置为一个可能值或由用户提前配置的默认值
            console.log(`警告: 订单 ${order.orderNumber || order.orderId} 未指定设备类型`);
        }
        
        // 计算并记录修改后的CR值
        const testDuration = parseFloat(order.testDuration);
        // 正确的CR值计算方式: CR = (要求完成时间 - 收样日期) / 测试时长
        const daysAvailable = (order.requiredDate - order.startDate) / (1000 * 60 * 60 * 24);
        order.cr = daysAvailable / testDuration;
    });
    
    // 按CR值排序，CR小的优先处理
    validOrders.sort((a, b) => a.cr - b.cr);
    
    // 初始化结果数组
    const results = [];
    
    // 为每个设备类型创建设备映射，以便于访问
    const deviceTypeMap = {};
    devices.forEach(device => {
        // 确保设备类型有值
        const type = device.deviceType || '未知设备类型';
        if (!deviceTypeMap[type]) {
            deviceTypeMap[type] = [];
        }
        // 确保每个设备有初始化的schedule数组
        device.schedule = device.schedule || [];
        // 初始化设备负载
        device.historicalLoad = device.historicalLoad || 0;
        deviceTypeMap[type].push(device);
    });
    
    // 处理每个订单
    validOrders.forEach(order => {
        // 确保设备类型不为空
        const deviceType = order.deviceType;
        
        if (!deviceType) {
            // 如果订单没有指定设备类型，将其标记为错误
            results.push({
                ...order,
                status: '缺少设备类型',
                errorDetail: '订单未指定设备类型，无法排期'
            });
            return;
        }
        
        const testDuration = parseFloat(order.testDuration);
        
        // 筛选可用设备类型
        const compatibleDevices = deviceTypeMap[deviceType] || [];
        
        if (compatibleDevices.length === 0) {
            console.log(`找不到兼容的设备类型: ${deviceType} 用于订单 ${order.orderNumber || order.orderId}`);
            results.push({
                ...order,
                status: '设备类型不兼容',
                errorDetail: `找不到兼容的设备类型: ${deviceType}`
            });
            return;
        }
        
        // 为每个设备计算最早的可用时间点
        compatibleDevices.forEach(device => {
            // 寻找最早可用的时间槽
            const earliestSlot = findEarliestAvailableSlot(device, order);
            
            // 计算任务结束时间
            const endDate = new Date(earliestSlot.getTime() + testDuration * 60 * 60 * 1000);
            
            // 记录临时数据用于后续排序和分配
            device.tempStartDate = earliestSlot;
            device.tempEndDate = endDate;
            device.tempExceedsDeadline = endDate > order.requiredDate;
        });
        
        // 按是否超出截止日期、负载均衡和空闲时间排序
        compatibleDevices.sort((a, b) => {
            // 考虑设备负载情况，优先使用负载较低的设备
            if (Math.abs(a.historicalLoad - b.historicalLoad) > 0.1) {
                return a.historicalLoad - b.historicalLoad;
            }
            
            // 如果负载相近，优先选择最早可用的设备
            return a.tempStartDate - b.tempStartDate;
        });
        
        // 尝试找到不会超出截止时间的设备
        const nonExceedingDevices = compatibleDevices.filter(d => !d.tempExceedsDeadline);
        
        let bestDevice;
        let willExceedDeadline = false;
        
        if (nonExceedingDevices.length > 0) {
            // 有设备能够在截止日期前完成任务，选择最佳的
            bestDevice = nonExceedingDevices[0];
        } else {
            // 没有设备能在截止日期前完成，选择结束时间最接近截止日期的设备
            willExceedDeadline = true;
            
            // 重新按照结束时间接近截止日期的程度排序
            compatibleDevices.sort((a, b) => {
                // 计算每个设备的结束时间与截止日期之间的差距
                const aGap = Math.abs(a.tempEndDate - order.requiredDate);
                const bGap = Math.abs(b.tempEndDate - order.requiredDate);
                return aGap - bGap; // 差距小的优先
            });
            
            // 选择差距最小的设备
            bestDevice = compatibleDevices[0];
            console.log(`订单 ${order.orderNumber || order.orderId} 将超出截止日期，选择时间最接近的设备 ${bestDevice.deviceId}`);
        }
        
        // 更新设备的调度
        bestDevice.schedule.push({
            orderId: order.orderId,
            startDate: bestDevice.tempStartDate,
            endDate: bestDevice.tempEndDate
        });
        
        // 更新设备的负载率
        updateDeviceLoad(bestDevice);
        
        // 将结果添加到数组中
        results.push({
            ...order,
            deviceId: bestDevice.deviceId,
            startDate: bestDevice.tempStartDate,
            endDate: bestDevice.tempEndDate,
            status: willExceedDeadline ? '超出完成时间' : '已排期',
            cr: order.cr // 使用订单的CR值
        });
        
        console.log(`订单 ${order.orderNumber || order.orderId} 已分配给设备 ${bestDevice.deviceId}, 开始时间: ${formatDate(bestDevice.tempStartDate)}, 结束时间: ${formatDate(bestDevice.tempEndDate)}, CR值: ${order.cr.toFixed(2)}, 状态: ${willExceedDeadline ? '超出完成时间' : '已排期'}`);
    });
    
    // 返回所有订单的结果，包括有效和无效的
    return [
        ...results,
        ...invalidOrders.map(order => ({
            ...order,
            status: '测试时长无效',
            errorDetail: `测试时长必须大于0: ${order.testDuration}`
        }))
    ];
}

// 找到最早可用的时间槽
function findEarliestAvailableSlot(device, order) {
    // 确保订单有有效的开始日期
    const orderStartDate = order.startDate instanceof Date ? order.startDate : new Date();
    
    // 使用收样日期作为起始点
    const startPoint = new Date(orderStartDate.getTime());
    // 保留原始时间，不强制设置为8:00
    
    // 如果设备没有排期，直接返回起始点
    if (!device.schedule || device.schedule.length === 0) {
        return startPoint;
    }
    
    // 过滤掉无效的排期项
    const validSchedule = device.schedule.filter(slot => slot.startDate && slot.endDate);
    
    // 如果过滤后没有有效排期，直接返回起始点
    if (validSchedule.length === 0) {
        return startPoint;
    }
    
    // 按开始时间排序设备的现有排期
    const sortedSchedule = [...validSchedule].sort((a, b) => a.startDate - b.startDate);
    
    // 保持每个任务之间至少有1小时的间隔
    const minGapMs = 60 * 60 * 1000; // 1小时的毫秒数
    
    // 候选开始时间
    let candidateStart = startPoint;
    
    // 检查给定时间是否与现有排期冲突
    let hasConflict = false;
    
    do {
        hasConflict = false;
        
        // 计算候选的结束时间
        const candidateEnd = new Date(candidateStart.getTime() + parseFloat(order.testDuration) * 60 * 60 * 1000);
        
        // 检查是否与任何现有时段冲突
        for (const slot of sortedSchedule) {
            // 如果候选时间段与当前时段有重叠
            if (!(candidateEnd <= new Date(slot.startDate.getTime() - minGapMs) || 
                  candidateStart >= new Date(slot.endDate.getTime() + minGapMs))) {
                // 有冲突，将候选开始时间移到当前时段之后，加上最小间隔
                candidateStart = new Date(slot.endDate.getTime() + minGapMs);
                hasConflict = true;
                break; // 找到冲突后跳出当前循环，用新的candidateStart重新检查
            }
        }
        
        // 安全检查：如果candidateStart已经是一个非常远的未来日期，则中断循环
        // 设置一个合理的上限，例如当前日期后五年
        const fiveYearsLater = new Date();
        fiveYearsLater.setFullYear(fiveYearsLater.getFullYear() + 5);
        
        if (candidateStart > fiveYearsLater) {
            console.warn(`警告：订单${order.orderId || order.orderNumber}的计划开始时间已超过5年，可能存在调度问题`);
            // 返回一个近期的日期作为备选，避免无限循环
            return new Date();
        }
        
    } while (hasConflict);
    
    // 最终返回找到的最早可用时间点
    return candidateStart;
}

// 更新设备负载率
function updateDeviceLoad(device) {
    // 如果没有排期，负载为0
    if (!device.schedule || device.schedule.length === 0) {
        device.historicalLoad = 0;
        return;
    }
    
    // 计算总测试时间
    let totalTestTime = 0;
    device.schedule.forEach(slot => {
        if (slot.startDate && slot.endDate) {
            totalTestTime += (slot.endDate - slot.startDate) / (1000 * 60 * 60);
        }
    });
    
    // 计算总可用时间（假设30天）
    const totalAvailableTime = 30 * 24;
    
    // 更新负载率
    device.historicalLoad = totalTestTime / totalAvailableTime;
    
    // 确保负载率在0-1之间
    device.historicalLoad = Math.min(1, Math.max(0, device.historicalLoad));
}

// 任务迁移函数 - 将高负载设备的任务迁移到低负载设备
function migrateTask(device, devices, results) {
    // 如果设备没有排期，则不需要迁移
    if (!device.schedule || device.schedule.length === 0) {
        console.log(`设备 ${device.deviceId} 没有任务需要迁移`);
        return false;
    }
    
    // 找到此设备类型的其他兼容设备
    const compatibleDevices = devices.filter(d => 
        d.deviceType === device.deviceType && d.deviceId !== device.deviceId && d.historicalLoad < 0.5
    );
    
    if (compatibleDevices.length === 0) {
        console.log(`没有找到负载较低的与设备 ${device.deviceId} 兼容的其他设备，无法迁移任务`);
        return false;
    }
    
    // 从当前设备的排期中找出最后一个任务
    const lastTask = device.schedule[device.schedule.length - 1];
    
    // 找到结果中对应的订单
    const orderIndex = results.findIndex(r => r.orderId === lastTask.orderId);
    if (orderIndex === -1) {
        console.log(`无法在结果中找到订单 ${lastTask.orderId}，迁移失败`);
        return false;
    }
    
    const order = results[orderIndex];
    const testDuration = parseFloat(order.testDuration);
    
    // 计算每个兼容设备的最早可用时间槽
    compatibleDevices.forEach(d => {
        const earliestSlot = findEarliestAvailableSlot(d, order);
        const endDate = new Date(earliestSlot.getTime() + testDuration * 60 * 60 * 1000);
        
        d.tempStartDate = earliestSlot;
        d.tempEndDate = endDate;
        d.tempExceedsDeadline = endDate > order.requiredDate;
    });
    
    // 按是否超出截止日期和负载进行排序
    compatibleDevices.sort((a, b) => {
        // 首先考虑是否超出截止日期
        if (a.tempExceedsDeadline !== b.tempExceedsDeadline) {
            return a.tempExceedsDeadline ? 1 : -1;
        }
        
        // 考虑设备负载情况，优先使用负载较低的设备
        if (Math.abs(a.historicalLoad - b.historicalLoad) > 0.1) {
            return a.historicalLoad - b.historicalLoad;
        }
        
        // 如果负载相近，优先选择最早可用的设备
        return a.tempStartDate - b.tempStartDate;
    });
    
    // 选择不超出截止日期的设备
    const nonExceedingDevices = compatibleDevices.filter(d => !d.tempExceedsDeadline);
    
    // 如果没有不超出截止日期的设备，取消迁移
    if (nonExceedingDevices.length === 0) {
        console.log(`迁移任务 ${order.orderId} 无法找到不超出截止日期的设备，取消迁移`);
        return false;
    }
    
    // 选择最佳设备进行迁移
    const targetDevice = nonExceedingDevices[0];
    
    // 执行迁移
    console.log(`迁移任务 ${order.orderId} 从设备 ${device.deviceId} 到设备 ${targetDevice.deviceId}`);
    
    // 从原设备移除任务
    device.schedule.pop();
    
    // 更新目标设备的排期
    targetDevice.schedule = targetDevice.schedule || [];
    targetDevice.schedule.push({
        orderId: order.orderId,
        startDate: targetDevice.tempStartDate,
        endDate: targetDevice.tempEndDate
    });
    
    // 更新两个设备的负载
    updateDeviceLoad(device);
    updateDeviceLoad(targetDevice);
    
    // 更新结果中的订单信息
    results[orderIndex].deviceId = targetDevice.deviceId;
    results[orderIndex].startDate = targetDevice.tempStartDate;
    results[orderIndex].endDate = targetDevice.tempEndDate;
    results[orderIndex].status = '已迁移';
    
    console.log(`任务 ${order.orderId} 成功迁移到设备 ${targetDevice.deviceId}, 新的历史负载: ${targetDevice.historicalLoad.toFixed(2)}`);
    return true;
}

// 更新设备类型过滤器
function updateDeviceTypeFilter() {
    // 清空现有选项，保留"全部"选项
    deviceTypeFilter.innerHTML = '<option value="">全部</option>';
    
    // 提取唯一的设备类型
    const deviceTypes = [...new Set(deviceData.map(device => device.deviceType))];
    
    // 添加设备类型选项
    deviceTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        deviceTypeFilter.appendChild(option);
    });
}

// 应用筛选 - 增强错误处理和数据验证
function applyFilters() {
    try {
        console.log('开始应用筛选...');
        
        const deviceFilter = (document.getElementById('deviceFilter')?.value || '').toLowerCase();
        const orderFilter = (document.getElementById('orderFilter')?.value || '').toLowerCase();
        const typeFilter = deviceTypeFilter?.value || '';
        const startDate = document.getElementById('dateRangeStart')?.value || '';
        const endDate = document.getElementById('dateRangeEnd')?.value || '';
        
        if (!scheduleResults || !Array.isArray(scheduleResults)) {
            console.error('无效的排期结果数据');
            showError('筛选失败: 无效的排期结果数据');
            return;
        }
        
        // 过滤结果 - 增强数据验证
    const filteredResults = scheduleResults.filter(result => {
            if (!result) return false;
            
        // 设备编号筛选
            if (deviceFilter && result.deviceId && 
                !result.deviceId.toString().toLowerCase().includes(deviceFilter)) {
            return false;
        }
        
        // 委托单号筛选
            const orderNumber = result.orderNumber || result.orderId || '';
            if (orderFilter && !orderNumber.toString().toLowerCase().includes(orderFilter)) {
            return false;
        }
        
        // 设备类型筛选
        if (typeFilter && result.deviceType !== typeFilter) {
            return false;
        }
        
            // 日期范围筛选 - 增强日期验证
            if (startDate && result.startDate) {
                const filterStart = new Date(startDate);
                const resultStart = new Date(result.startDate);
                
                if (!isNaN(filterStart.getTime()) && !isNaN(resultStart.getTime()) &&
                    filterStart > resultStart) {
            return false;
                }
            }
            
            if (endDate && result.endDate) {
                const filterEnd = new Date(endDate);
                const resultEnd = new Date(result.endDate);
                
                if (!isNaN(filterEnd.getTime()) && !isNaN(resultEnd.getTime()) &&
                    filterEnd < resultEnd) {
            return false;
                }
        }
        
        return true;
    });
        
        console.log(`筛选后结果数量: ${filteredResults.length}`);
    
    // 重新渲染结果
    renderResults(filteredResults);
    } catch (error) {
        console.error('应用筛选时发生错误:', error);
        showError(`应用筛选失败: ${error.message}`);
    }
}

// 重置筛选
function resetFilters() {
    document.getElementById('deviceFilter').value = '';
    document.getElementById('orderFilter').value = '';
    deviceTypeFilter.value = '';
    document.getElementById('dateRangeStart').value = '';
    document.getElementById('dateRangeEnd').value = '';
    
    // 重新渲染所有结果
    renderResults(scheduleResults);
}

// 渲染结果
function renderResults(results) {
    console.log('开始渲染结果...');
    
    // 渲染表格 - 启用设备类型和设备ID聚类
    renderTable(results);
    
    // 渲染甘特图 - 确保只在有有效结果时才渲染，并增加延迟
    setTimeout(() => {
        try {
            // 只有当筛选结果包含有效数据时才尝试渲染甘特图
            if (results && results.length > 0 && results.some(r => r.startDate && r.endDate)) {
        renderGantt(results);
            } else {
                // 如果没有有效数据，显示提示信息
                const ganttChart = document.getElementById('ganttChart');
                if (ganttChart) {
                    ganttChart.innerHTML = '<div class="empty-gantt-message">没有符合条件的任务可以在甘特图中显示</div>';
                }
            }
        } catch (error) {
            console.error('渲染甘特图时发生错误:', error);
            const ganttChart = document.getElementById('ganttChart');
            if (ganttChart) {
                ganttChart.innerHTML = '<div class="error-message">甘特图渲染失败: ' + error.message + '</div>';
            }
        }
    }, 300); // 增加延迟时间，确保DOM已完全准备好
    
    // 确保结果容器可见
    document.getElementById('resultsSection').style.display = 'block';
}

// 渲染表格
function renderTable(results) {
    const tableBody = document.getElementById('scheduleTableBody');
    tableBody.innerHTML = '';
    
    // 对结果进行排序，先按设备类型，再按设备ID排序，然后按开始时间排序，实现聚类展示
    const sortedResults = [...results].sort((a, b) => {
        // 首先按设备类型排序
        if (a.deviceType !== b.deviceType) {
            return a.deviceType.localeCompare(b.deviceType);
        }
        
        // 然后按设备ID排序，考虑数字部分
        const aIdNum = extractNumber(a.deviceId || '');
        const bIdNum = extractNumber(b.deviceId || '');
        if (aIdNum !== bIdNum) {
            return aIdNum - bIdNum;
        }
        
        // 最后按计划开始时间排序
        const aStartDate = a.startDate ? new Date(a.startDate).getTime() : 0;
        const bStartDate = b.startDate ? new Date(b.startDate).getTime() : 0;
        return aStartDate - bStartDate;
    });
    
    // 跟踪当前的设备类型和设备ID，用于创建分组行
    let currentDeviceType = null;
    let currentDeviceId = null;

    sortedResults.forEach(result => {
        // 当设备类型发生变化时，添加设备类型分组行
        if (result.deviceType !== currentDeviceType) {
            currentDeviceType = result.deviceType;
            currentDeviceId = null; // 重置设备ID，确保在新的设备类型下显示第一个设备ID分组行
            
            // 添加设备类型分组行
            const typeRow = document.createElement('tr');
            typeRow.className = 'device-type-row';
            
            const typeCell = document.createElement('td');
            typeCell.textContent = result.deviceType || '未知类型';
            typeCell.colSpan = 8; // 跨越所有列
            typeCell.style.fontWeight = 'bold';
            typeCell.style.backgroundColor = '#e0f2f1';
            typeCell.style.color = '#00796b';
            typeCell.style.padding = '10px';
            typeCell.style.borderBottom = '2px solid #00796b';
            
            typeRow.appendChild(typeCell);
            tableBody.appendChild(typeRow);
        }
        
        // 当设备ID发生变化时，添加设备ID分组行
        if (result.deviceId !== currentDeviceId) {
            currentDeviceId = result.deviceId;
            
            // 添加设备ID分组行
            const deviceRow = document.createElement('tr');
            deviceRow.className = 'device-id-row';
            
            const deviceCell = document.createElement('td');
            deviceCell.textContent = '设备: ' + (result.deviceId || '未分配');
            deviceCell.colSpan = 8; // 跨越所有列
            deviceCell.style.fontWeight = 'bold';
            deviceCell.style.backgroundColor = '#e8f5e9';
            deviceCell.style.color = '#2e7d32';
            deviceCell.style.padding = '6px 10px';
            deviceCell.style.borderBottom = '1px dashed #2e7d32';
            
            deviceRow.appendChild(deviceCell);
            tableBody.appendChild(deviceRow);
        }
        
        // 创建正常的数据行
        const row = document.createElement('tr');
        
        // 设置行的类名，用于样式
        if (result.status === '时间悖论错误' || result.status === '超出截止日期') {
            row.className = 'error-row';
        } else if (result.status === '已迁移') {
            row.className = 'migrated-row';
        } else if (result.status === '缺少测试时长') {
            row.className = 'missing-duration-row';
        } else if (result.dataQuality < 0.7) {
            row.className = 'warning-row'; // 添加新的样式用于标记数据质量较低的记录
        }
        
        // 设备编号 - 在分组模式下可以隐藏，因为已经在分组头中显示
        let cell = document.createElement('td');
        cell.textContent = result.deviceId;
        cell.style.paddingLeft = '20px'; // 增加缩进，表示层级关系
        row.appendChild(cell);
        
        // 委托单号 - 使用orderNumber而不是orderId
        cell = document.createElement('td');
        cell.textContent = result.orderNumber || result.orderId || 'N/A';
        row.appendChild(cell);
        
        // 设备类别 - 在分组模式下可以隐藏，因为已经在分组头中显示
        cell = document.createElement('td');
        cell.textContent = result.deviceType;
        row.appendChild(cell);
        
        // 测试时长
        cell = document.createElement('td');
        if (result.testDuration === null) {
            cell.textContent = '缺失';
            cell.title = '缺少测试时长数据，无法排期';
            cell.classList.add('missing-data');
        } else {
            // 完全移除自动计算的测试时长标记
            cell.textContent = result.testDuration;
        }
        row.appendChild(cell);
        
        // 计划开始时间
        cell = document.createElement('td');
        cell.textContent = result.startDate ? formatDate(result.startDate) : 'N/A';
        row.appendChild(cell);
        
        // 计划完成时间
        cell = document.createElement('td');
        cell.textContent = result.endDate ? formatDate(result.endDate) : 'N/A';
        row.appendChild(cell);
        
        // CR值
        cell = document.createElement('td');
        cell.textContent = result.cr === Infinity ? 'N/A' : (result.cr ? result.cr.toFixed(2) : 'N/A');
        row.appendChild(cell);
        
        // 状态
        cell = document.createElement('td');
        cell.textContent = result.status;
        row.appendChild(cell);
        
        tableBody.appendChild(row);
    });
    
    // 添加表格脚注说明
    const tableContainer = document.querySelector('.table-container');
    let footerNote = document.querySelector('.table-footer-note');
    if (!footerNote) {
        footerNote = document.createElement('div');
        footerNote.className = 'table-footer-note';
        tableContainer.appendChild(footerNote);
    }
    
    footerNote.innerHTML = `
        <div style="margin-bottom: 8px;">表格已按设备类别和设备编号进行聚类分组显示，同一设备的任务按计划开始时间排序</div>
        <div>缺少测试时长的委托单无法参与排期</div>
        <div>CR值（紧急比率）= (要求完成时间 - 收样日期) / 测试时长，CR越小表示任务越紧急</div>
    `;
    
    // 添加分组表格的样式
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .device-type-row {
            background-color: #e0f2f1;
            cursor: pointer;
        }
        .device-id-row {
            background-color: #e8f5e9;
            cursor: pointer;
        }
        .empty-gantt-message {
            padding: 30px;
            text-align: center;
            color: #666;
            font-size: 16px;
            background-color: #f9f9f9;
            border-radius: 4px;
            margin-top: 20px;
        }
        /* 数据行的悬停效果 */
        #scheduleTableBody tr:not(.device-type-row):not(.device-id-row):hover {
            background-color: #f5f5f5;
        }
        /* 增强分组可见性 */
        .device-type-row + .device-id-row {
            border-top: none;
        }
        /* 任务行左侧边框增强 */
        .gantt_cell {
            border-right: 1px solid #e0e0e0 !important;
        }
        /* 设备类型行样式 */
        .device-type-row {
            background-color: rgba(33, 150, 243, 0.05) !important;
            font-weight: bold !important;
        }
        /* 设备ID行样式 */
        .device-id-row {
            background-color: rgba(0, 0, 0, 0.02) !important;
        }
        /* 不同设备类型的颜色 */
        .device-type-0 {
            border-left: 3px solid #2196F3 !important;
        }
        .device-type-1 {
            border-left: 3px solid #4CAF50 !important;
        }
        .device-type-2 {
            border-left: 3px solid #FFC107 !important;
        }
        .device-type-3 {
            border-left: 3px solid #9C27B0 !important;
        }
        .device-type-4 {
            border-left: 3px solid #F44336 !important;
        }
        /* 任务行分隔符 */
        .gantt_task_row {
            border-bottom: 1px solid #e0e0e0 !important;
        }
        /* 自定义模态对话框样式 */
        .gantt-task-modal {
            display: none;
            position: fixed;
            z-index: 9999;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0,0,0,0.4);
        }
        .modal-content {
            position: relative;
            background-color: #fefefe;
            margin: 10% auto;
            padding: 20px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            width: 600px;
            max-width: 90%;
            font-family: 'Microsoft YaHei', sans-serif;
            animation: modalFadeIn 0.3s ease-out;
        }
        @keyframes modalFadeIn {
            from {opacity: 0; transform: translateY(-50px);}
            to {opacity: 1; transform: translateY(0);}
        }
        .modal-header {
            position: relative;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 15px;
            margin-bottom: 15px;
        }
        .modal-title {
            font-size: 18px;
            font-weight: bold;
            color: #134e5e;
            margin: 0;
            padding-right: 30px;
        }
        .modal-close {
            position: absolute;
            right: 0;
            top: 0;
            font-size: 24px;
            font-weight: bold;
            color: #aaa;
            cursor: pointer;
        }
        .modal-close:hover {
            color: #134e5e;
        }
        .modal-body {
            max-height: 500px;
            overflow-y: auto;
        }
        .detail-section {
            margin-bottom: 20px;
        }
        .detail-section-title {
            font-size: 15px;
            font-weight: bold;
            color: #0d6efd;
            padding: 5px 10px;
            background-color: #f0f8ff;
            border-radius: 4px;
            margin-bottom: 10px;
        }
        .detail-table {
            width: 100%;
            border-collapse: collapse;
        }
        .detail-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .detail-table tr:hover {
            background-color: #f0f0f0;
        }
        .detail-label {
            width: 130px;
            font-weight: bold;
            padding: 8px 10px;
            text-align: right;
            vertical-align: top;
            color: #555;
            border-bottom: 1px solid #efefef;
        }
        .detail-value {
            padding: 8px 10px;
            color: #333;
            text-align: left;
            border-bottom: 1px solid #efefef;
        }
        .status-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            color: white;
        }
        .status-scheduled {
            background-color: #28a745;
        }
        .status-overdue {
            background-color: #dc3545;
        }
        .status-incompatible {
            background-color: #ffc107;
            color: #333;
        }
        .status-migrated {
            background-color: #17a2b8;
        }
        .status-invalid {
            background-color: #6c757d;
        }
    `;
    document.head.appendChild(styleElement);
}

// 渲染甘特图 - 完全重构，简化配置，增强稳定性
function renderGantt(results) {
    console.log('开始渲染甘特图，结果数量:', results.length);
    
    // 清空甘特图容器
    const ganttChart = document.getElementById('ganttChart');
    if (!ganttChart) {
        console.error('找不到甘特图容器元素 #ganttChart');
        return;
    }
    
    // 先清空甘特图内容
    ganttChart.innerHTML = '';
    
    try {
        // 首先检查是否有有效数据
        const filteredValidResults = results.filter(r => r.deviceId !== '未分配' && r.startDate && r.endDate);
        if (filteredValidResults.length === 0) {
            ganttChart.innerHTML = '<div class="empty-gantt-message">没有符合条件的任务可以在甘特图中显示</div>';
            return;
        }
        
        // 确保甘特图容器可见并设置明确的高度和宽度
        ganttChart.style.display = 'block';
        ganttChart.style.height = '700px';
        ganttChart.style.width = '100%';
        
        // 重置gantt对象状态，避免之前的配置影响
        if (typeof gantt !== 'undefined' && gantt.clearAll) {
            try {
                gantt.clearAll();
            } catch (e) {
                console.warn('清除甘特图时出错:', e);
            }
        }
        
        // 创建自定义模态对话框
        const modalContainer = document.createElement('div');
        modalContainer.id = 'gantt-task-modal';
        modalContainer.className = 'gantt-task-modal';
        modalContainer.style.display = 'none';
        document.body.appendChild(modalContainer);
        
        // 设置中文本地化 - 完整版
        gantt.locale = {
            date: {
                month_full: ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"],
                month_short: ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"],
                day_full: ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"],
                day_short: ["日", "一", "二", "三", "四", "五", "六"]
            },
            labels: {
                new_task: "新任务",
                icon_save: "保存",
                icon_cancel: "取消",
                icon_details: "详情",
                icon_edit: "编辑",
                icon_delete: "删除",
                confirm_closing: "您确定要取消任务编辑？",
                confirm_deleting: "任务将被删除，是否继续？",
                section_description: "描述",
                section_time: "时间段",
                section_type: "类型",
                column_text: "任务名称",
                column_start_date: "开始时间",
                column_duration: "持续时间",
                column_add: "添加",
                link: "关联",
                confirm_link_deleting: "将被删除",
                link_start: "开始于",
                link_end: "结束于",
                type_task: "任务",
                type_project: "项目",
                type_milestone: "里程碑",
                minutes: "分钟",
                hours: "小时",
                days: "天",
                weeks: "周",
                months: "月",
                years: "年"
            }
        };
        
        // 最简化的甘特图配置
        gantt.config.xml_date = "%Y-%m-%d %H:%i";
        gantt.config.fit_tasks = true; // 自动调整任务大小以适应内容
        gantt.config.scale_height = 50; // 扩大时间刻度高度
        
        // 使用完全中文化的时间刻度配置
        gantt.config.scales = [
            {unit: "month", step: 1, format: "%Y年%M"},  // 年月显示
            {unit: "week", step: 1, format: "第%W周"},   // 周数显示
            {unit: "day", step: 1, format: "%j日 %D"}    // 日期和星期显示
        ];
        
        // 设置最小尺寸
        gantt.config.min_column_width = 70;
        gantt.config.row_height = 35;
        
        // 关闭tooltip
        gantt.config.tooltip_timeout = 0; // 禁用默认tooltip
        
        // 为任务行添加数据类型标识，以便应用不同样式
        gantt.templates.task_row_class = function(start, end, task) {
            let classes = [];
            if (task.deviceType) {
                classes.push("device-type-row");
            }
            if (task.deviceId) {
                classes.push("device-id-row");
            }
            // 根据设备分类添加不同的颜色类
            const deviceTypeIndex = task.deviceType ? 
                Math.abs(task.deviceType.hashCode() % 5) : 0;
            classes.push(`device-type-${deviceTypeIndex}`);
            
            return classes.join(" ");
        };
        
        // 扩展String原型，添加hashCode方法用于生成唯一标识
        if (!String.prototype.hashCode) {
            String.prototype.hashCode = function() {
                let hash = 0;
                for (let i = 0; i < this.length; i++) {
                    hash = ((hash << 5) - hash) + this.charCodeAt(i);
                    hash |= 0; // 转换为32位整数
                }
                return hash;
            };
        }
        
        // 设置列配置
        gantt.config.columns = [
            {name: "deviceType", label: "设备类别", width: 100, 
                template: function(task) {
                    return task.deviceType || "";
                }
            },
            {name: "deviceId", label: "设备编号", width: 100, align: "center", 
                template: function(task) {
                    return task.deviceId || "";
                }
            },
            {name: "text", label: "委托单号", align: "center", width: 150},
            {name: "duration", label: "测试时长", align: "center", width: 100, 
                template: function(task) {
                    return (task.testDuration || task.duration) + "小时";
                }
            }
        ];
        
        // 只设置基本的视觉样式
        gantt.templates.task_class = function() {
            return "tech-blue-task";
        };
        
        // 简化的数据格式
        const ganttData = {
            data: []
        };
        
        // 对结果排序 - 简化排序逻辑
        const sortedResults = [...filteredValidResults].sort((a, b) => {
            if (!a.deviceType || !b.deviceType) return 0;
            return a.deviceType.localeCompare(b.deviceType);
        });
        
        // 添加任务数据 - 确保每个字段都有有效值
        sortedResults.forEach((result, index) => {
            if (!result.startDate || !result.endDate) return; // 跳过无效数据
            
            try {
                // 安全解析日期
                const startDate = new Date(result.startDate);
                const endDate = new Date(result.endDate);
                
                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    console.warn('跳过无效日期的任务:', result);
                    return; // 跳过无效日期
                }
                
                // 格式化日期
                const start_date = formatGanttDate(startDate);
                const end_date = formatGanttDate(endDate);
                
                // 确保测试时长是数值
                let testDuration = parseFloat(result.testDuration);
                if (isNaN(testDuration)) testDuration = 1; // 默认至少1小时
                
                // 创建甘特图任务项，保留所有原始数据用于工具提示
                ganttData.data.push({
                    id: `task_${index}`,
                    text: result.orderNumber || result.orderId || '未命名任务',
                    start_date: start_date,
                    end_date: end_date,
                    deviceId: result.deviceId || '未分配',
                    deviceType: result.deviceType || '未知类型',
                    testDuration: testDuration,
                    progress: 0.5, // 固定进度为50%
                    open: true,
                    // 保存原始数据用于详细提示
                    status: result.status,
                    cr: result.cr,
                    dataQuality: result.dataQuality,
                    orderNumber: result.orderNumber,
                    orderId: result.orderId,
                    // 添加其他委托单详细信息字段
                    organization: result.organization || result.companyName || result.company,
                    clientName: result.clientName || result.client || result.contactPerson,
                    projectName: result.projectName || result.project,
                    projectId: result.projectId || result.projectNumber,
                    sampleName: result.sampleName || result.sample || result.materialName
                });
            } catch (err) {
                console.warn('处理任务数据时出错:', err, result);
            }
        });
        
        // 检查是否生成了有效的任务数据
        if (ganttData.data.length === 0) {
            ganttChart.innerHTML = '<div class="empty-gantt-message">筛选后没有有效的任务数据可以显示</div>';
            return;
        }
        
        console.log('甘特图数据准备完成，任务数:', ganttData.data.length);
        
        // 添加自定义样式
        const styleEl = document.createElement('style');
        styleEl.textContent = `
            .tech-blue-task {
                background: linear-gradient(to right, #134e5e, #2a83a2) !important;
                border-radius: 3px !important;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2) !important;
                border: 1px solid #0a3d4d !important;
                cursor: pointer !important;
            }
            
            .tech-blue-task .gantt_task_content {
                color: white !important;
                font-weight: 500 !important;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important;
            }
            
            .empty-gantt-message {
                padding: 20px;
                text-align: center;
                color: #555;
                font-size: 16px;
                background-color: #f8f9fa;
                border-radius: 4px;
                margin-top: 20px;
            }
            
            .gantt_grid_head_cell {
                font-weight: bold;
                background-color: #f0f4f9;
            }
            
            /* 增强任务行分隔线 */
            .gantt_row {
                border-bottom: 1px solid #e0e0e0 !important;
            }
            
            /* 偶数行背景色加深，提高行区分度 */
            .gantt_row:nth-child(even) {
                background-color: #f5f7fa !important;
            }
            
            /* 行悬停效果 */
            .gantt_row:hover {
                background-color: #eaf1f7 !important;
            }
            
            /* 设备类型行特殊显示 */
            .gantt_row[data-type="deviceType"] {
                border-bottom: 2px solid #bbdefb !important;
                background-color: rgba(25, 118, 210, 0.08) !important;
            }
            
            /* 设备行特殊显示 */
            .gantt_row[data-type="device"] {
                border-bottom: 1px dashed #90caf9 !important;
            }
            
            /* 任务行左侧边框增强 */
            .gantt_cell {
                border-right: 1px solid #e0e0e0 !important;
            }
            
            /* 自定义模态对话框样式 */
            .gantt-task-modal {
                display: none;
                position: fixed;
                z-index: 9999;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: rgba(0,0,0,0.4);
            }
            
            .modal-content {
                position: relative;
                background-color: #fefefe;
                margin: 10% auto;
                padding: 20px;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                width: 600px;
                max-width: 90%;
                font-family: 'Microsoft YaHei', sans-serif;
                animation: modalFadeIn 0.3s ease-out;
            }
            
            @keyframes modalFadeIn {
                from {opacity: 0; transform: translateY(-50px);}
                to {opacity: 1; transform: translateY(0);}
            }
            
            .modal-header {
                position: relative;
                border-bottom: 1px solid #e0e0e0;
                padding-bottom: 15px;
                margin-bottom: 15px;
            }
            
            .modal-title {
                font-size: 18px;
                font-weight: bold;
                color: #134e5e;
                margin: 0;
                padding-right: 30px;
            }
            
            .modal-close {
                position: absolute;
                right: 0;
                top: 0;
                font-size: 24px;
                font-weight: bold;
                color: #aaa;
                cursor: pointer;
            }
            
            .modal-close:hover {
                color: #134e5e;
            }
            
            .modal-body {
                max-height: 500px;
                overflow-y: auto;
            }
            
            .detail-section {
                margin-bottom: 20px;
            }
            
            .detail-section-title {
                font-size: 15px;
                font-weight: bold;
                color: #0d6efd;
                padding: 5px 10px;
                background-color: #f0f8ff;
                border-radius: 4px;
                margin-bottom: 10px;
            }
            
            .detail-table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .detail-table tr:nth-child(even) {
                background-color: #f9f9f9;
            }
            
            .detail-table tr:hover {
                background-color: #f0f0f0;
            }
            
            .detail-label {
                width: 130px;
                font-weight: bold;
                padding: 8px 10px;
                text-align: right;
                vertical-align: top;
                color: #555;
                border-bottom: 1px solid #efefef;
            }
            
            .detail-value {
                padding: 8px 10px;
                color: #333;
                text-align: left;
                border-bottom: 1px solid #efefef;
            }
            
            .status-badge {
                display: inline-block;
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                color: white;
            }
            
            .status-scheduled {
                background-color: #28a745;
            }
            
            .status-overdue {
                background-color: #dc3545;
            }
            
            .status-incompatible {
                background-color: #ffc107;
                color: #333;
            }
            
            .status-migrated {
                background-color: #17a2b8;
            }
            
            .status-invalid {
                background-color: #6c757d;
            }
        `;
        document.head.appendChild(styleEl);
        
        // 获取时间范围
        if (ganttData.data.length > 0) {
            try {
                // 找出最早和最晚的日期
                const dates = ganttData.data.map(task => {
                    return {
                        start: new Date(task.start_date),
                        end: new Date(task.end_date)
            };
        });
        
                const minDate = new Date(Math.min(...dates.map(d => d.start.getTime())));
                const maxDate = new Date(Math.max(...dates.map(d => d.end.getTime())));
                
                // 扩展时间范围前后各一周
                minDate.setDate(minDate.getDate() - 7);
                maxDate.setDate(maxDate.getDate() + 7);
                
                gantt.config.start_date = minDate;
                gantt.config.end_date = maxDate;
            } catch (e) {
                console.warn('设置时间范围出错:', e);
            }
        }
        
        // 点击任务事件处理
        gantt.attachEvent("onTaskClick", function(id, e){
            const task = gantt.getTask(id);
            showTaskDetailsModal(task);
            return true; // 返回true阻止默认动作
        });
        
        // 安全的初始化甘特图
        try {
            console.log('开始初始化甘特图...');
            gantt.init('ganttChart');
            console.log('甘特图初始化完成');
            
            // 解析数据并渲染
            console.log('开始加载甘特图数据...');
            gantt.parse(ganttData);
            console.log('甘特图数据加载并渲染完成');
        } catch (e) {
            console.error('甘特图初始化或数据加载失败:', e);
            ganttChart.innerHTML = `<div class="empty-gantt-message">甘特图渲染失败: ${e.message}</div>`;
            return;
        }
        
    } catch (error) {
        console.error('甘特图渲染过程中发生错误:', error);
        ganttChart.innerHTML = `<div class="empty-gantt-message">甘特图渲染失败: ${error.message}</div>`;
    }
}

// 显示任务详情模态框
function showTaskDetailsModal(task) {
    console.log('显示任务详情:', task);
    
    // 获取或创建模态框容器
    let modalContainer = document.getElementById('gantt-task-modal');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'gantt-task-modal';
        modalContainer.className = 'gantt-task-modal';
        document.body.appendChild(modalContainer);
    }
    
    // 获取任务状态的CSS类
    const getStatusClass = (status) => {
        if (!status) return '';
        
        const statusText = status.toLowerCase();
        if (statusText.includes('排期')) return 'status-scheduled';
        if (statusText.includes('超出')) return 'status-overdue';
        if (statusText.includes('不兼容')) return 'status-incompatible';
        if (statusText.includes('迁移')) return 'status-migrated';
        if (statusText.includes('无效')) return 'status-invalid';
        
        return '';
    };
    
    // 创建模态框内容
    modalContainer.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">${task.text || "未命名任务"}</h2>
                <span class="modal-close">&times;</span>
            </div>
            <div class="modal-body">
                <!-- 基本任务信息部分 -->
                <div class="detail-section">
                    <div class="detail-section-title">基本信息</div>
                    <table class="detail-table">
                        <tr>
                            <td class="detail-label">委托单号：</td>
                            <td class="detail-value">${task.orderNumber || task.text || "未知"}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">委托单位：</td>
                            <td class="detail-value">${task.organization || "未填写"}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">委托人：</td>
                            <td class="detail-value">${task.clientName || "未填写"}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">状态：</td>
                            <td class="detail-value">
                                ${task.status ? 
                                  `<span class="status-badge ${getStatusClass(task.status)}">${task.status}</span>` : 
                                  "未知状态"}
                            </td>
                        </tr>
                    </table>
                </div>
                
                <!-- 项目信息部分 -->
                <div class="detail-section">
                    <div class="detail-section-title">项目信息</div>
                    <table class="detail-table">
                        <tr>
                            <td class="detail-label">项目名称：</td>
                            <td class="detail-value">${task.projectName || "未填写"}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">项目编号：</td>
                            <td class="detail-value">${task.projectId || "未填写"}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">样件名称：</td>
                            <td class="detail-value">${task.sampleName || "未填写"}</td>
                        </tr>
                    </table>
                </div>
                
                <!-- 设备信息部分 -->
                <div class="detail-section">
                    <div class="detail-section-title">设备信息</div>
                    <table class="detail-table">
                        <tr>
                            <td class="detail-label">设备类别：</td>
                            <td class="detail-value">${task.deviceType || "未知"}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">设备编号：</td>
                            <td class="detail-value">${task.deviceId || "未分配"}</td>
                        </tr>
                    </table>
                </div>
                
                <!-- 时间信息部分 -->
                <div class="detail-section">
                    <div class="detail-section-title">时间信息</div>
                    <table class="detail-table">
                        <tr>
                            <td class="detail-label">开始时间：</td>
                            <td class="detail-value">${formatDateChinese(new Date(task.start_date))}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">结束时间：</td>
                            <td class="detail-value">${formatDateChinese(new Date(task.end_date))}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">测试时长：</td>
                            <td class="detail-value">${(task.testDuration || task.duration || "未知")}小时</td>
                        </tr>
                        ${task.cr !== undefined ? `
                        <tr>
                            <td class="detail-label">CR值：</td>
                            <td class="detail-value">${typeof task.cr === 'number' ? task.cr.toFixed(2) : task.cr}</td>
                        </tr>
                        ` : ''}
                    </table>
                </div>
            </div>
        </div>
    `;
    
    // 显示模态框
    modalContainer.style.display = 'block';
    
    // 绑定关闭按钮事件
    const closeBtn = modalContainer.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.onclick = function() {
            modalContainer.style.display = 'none';
        };
    }
    
    // 点击模态框外部关闭
    modalContainer.onclick = function(event) {
        if (event.target === modalContainer) {
            modalContainer.style.display = 'none';
        }
    };
}

// 格式化日期为中文格式字符串（用于工具提示）
function formatDateChinese(date) {
    if (!date) return '未知时间';
    
    // 如果是字符串日期，转换为日期对象
    if (typeof date === 'string') {
        date = new Date(date);
    }
    
    if (isNaN(date.getTime())) return '无效日期';
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    // 补零函数
    const padZero = (num) => num < 10 ? `0${num}` : num;
    
    // 返回完全中文化的日期格式
    return `${year}年${month}月${day}日 ${padZero(hours)}时${padZero(minutes)}分`;
}

// 格式化日期为字符串
function formatDate(date) {
    if (!date) return 'N/A';
    return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())} ${padZero(date.getHours())}:${padZero(date.getMinutes())}`;
}

// 格式化日期为甘特图格式
function formatGanttDate(date) {
    if (!date) return '';
    return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())} ${padZero(date.getHours())}:${padZero(date.getMinutes())}`;
}

// 补零函数
function padZero(num) {
    return num < 10 ? `0${num}` : num;
}

// 切换标签页 - 增强稳定性
function switchTab(tabId) {
    console.log('切换到标签页:', tabId);
    
    try {
    // 移除所有标签的活动状态
    tabBtns.forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    
    // 设置当前标签为活动状态
        const currentTabBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        const currentTabPane = document.getElementById(`${tabId}Tab`);
        
        if (!currentTabBtn || !currentTabPane) {
            console.warn(`未找到标签页: ${tabId}`);
            return;
        }
        
        currentTabBtn.classList.add('active');
        currentTabPane.classList.add('active');
    
    // 如果切换到甘特图标签，确保甘特图正确显示
    if (tabId === 'gantt') {
        console.log('显示甘特图标签');
        const ganttChart = document.getElementById('ganttChart');
            if (!ganttChart) return;
            
            ganttChart.style.display = 'block';
            
            // 只有当甘特图中有任务时才刷新
            if (typeof gantt !== 'undefined' && gantt.getTaskCount && gantt.getTaskCount() > 0) {
                try {
                    // 延迟执行，确保DOM已更新
            setTimeout(() => {
                    gantt.render();
                    console.log('甘特图重新渲染完成');
                    }, 100);
                } catch (e) {
                    console.error('甘特图重新渲染失败:', e);
                }
        }
        }
    } catch (error) {
        console.error('切换标签页时发生错误:', error);
    }
}

// 隐藏所有部分
function hideAllSections() {
    processingSection.style.display = 'none';
    filterSection.style.display = 'none';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';
}

// 显示错误
function showError(message) {
    hideAllSections();
    errorMessage.textContent = message;
    errorSection.style.display = 'block';
}

// 显示数据处理摘要
function showDataSummary(orderData, deviceData, results) {
    // 创建摘要元素
    const summarySection = document.createElement('section');
    summarySection.className = 'data-summary-section';
    
    // 计算缺少测试时长的订单数
    const missingDurationOrders = orderData.filter(item => item.testDuration === null).length;
    
    // 计算有效订单和排期结果
    const validOrders = orderData.filter(item => item.testDuration !== null && item.testDuration > 0).length;
    const scheduledOrders = results.filter(item => item.status === '已排期' || item.status === '已迁移').length;
    const unschedulableOrders = results.filter(item => 
        item.status !== '已排期' && 
        item.status !== '已迁移' && 
        item.status !== '缺少测试时长'
    ).length;
    
    summarySection.innerHTML = `
        <h2>数据处理摘要</h2>
        <div class="summary-container">
            <div class="summary-item">
                <h3>委托数据</h3>
                <p>总数: ${orderData.length} 条</p>
                <p>有效委托: ${validOrders} 条</p>
                <p>缺少测试时长: ${missingDurationOrders} 条</p>
                <p>时间异常: ${orderData.filter(item => item.status === '时间悖论错误').length} 条</p>
            </div>
            <div class="summary-item">
                <h3>设备数据</h3>
                <p>总数: ${deviceData.length} 条</p>
                <p>设备类型: ${[...new Set(deviceData.map(item => item.deviceType))].length} 种</p>
            </div>
            <div class="summary-item">
                <h3>排期结果</h3>
                <p>总任务: ${results.length} 个</p>
                <p>成功排期: ${scheduledOrders} 个</p>
                <p>无法排期: ${unschedulableOrders} 个</p>
                <p>缺少测试时长: ${missingDurationOrders} 个</p>
            </div>
        </div>
    `;
    
    // 添加到结果区域前面
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.parentNode.insertBefore(summarySection, resultsSection);
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', init); 

function findFieldIndex(headers, possibleNames) {
    // 规范化搜索 - 移除空格、转小写
    const normalizeStr = (str) => str.toLowerCase().replace(/\s+/g, '').replace(/[（）()]/g, '');
    
    // 遍历所有可能的字段名
    for (const name of possibleNames) {
        const normalizedName = normalizeStr(name);
        
        // 在headers中查找完全匹配的字段
        const exactMatch = headers.findIndex(header => 
            normalizeStr(header) === normalizedName
        );
        
        if (exactMatch !== -1) return exactMatch;
        
        // 查找包含关键词的字段
        const partialMatch = headers.findIndex(header => 
            normalizeStr(header).includes(normalizedName)
        );
        
        if (partialMatch !== -1) return partialMatch;
    }
    
    return -1;
} 

// 准备甘特图时添加排序和分组逻辑
function prepareGanttTasks(dataList) {
    // ... existing code ...
    
    // 对任务进行排序
    ganttTasks.data.sort((a, b) => {
        // 首先按设备类型排序
        if (a.device_type !== b.device_type) {
            return a.device_type.localeCompare(b.device_type);
        }
        
        // 其次按设备编号排序（将数字部分作为数值比较）
        const aNum = extractNumber(a.device_id);
        const bNum = extractNumber(b.device_id);
        
        if (aNum !== bNum) {
            return aNum - bNum;
        }
        
        // 最后按委托单号排序
        return a.text.localeCompare(b.text);
    });
    
    return ganttTasks;
}

// 从字符串中提取数字
function extractNumber(str) {
    if (!str) return 0;
    const matches = str.match(/\d+/);
    return matches ? parseInt(matches[0]) : 0;
} 