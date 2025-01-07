// 配置对象
const CONFIG = {
    API_KEY: 'sk-6329457b4fd04e15b4b25bbb21cdb6cd',
    API_ENDPOINT: 'https://api.deepseek.com/chat/completions',
    DEBUG: true
};

class ChatAnalyzer {
    constructor() {
        this.debug = true;  // 开启调试模式
        this.apiEndpoint = CONFIG.API_ENDPOINT;
        this.messagePattern = /^([^:：]+)[:|：](.+)$/;
        this.debugOutput = document.getElementById('debugContent');
        this.isAnalyzing = false;
    }

    log(...args) {
        if (this.debug) {
            const message = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
            ).join(' ');
            
            console.log('[ChatAnalyzer]', ...args);
            
            if (this.debugOutput) {
                const time = new Date().toLocaleTimeString();
                this.debugOutput.innerHTML += `[${time}] ${message}\n`;
                this.debugOutput.scrollTop = this.debugOutput.scrollHeight;
            }
        }
    }

    async analyze(text) {
        if (this.isAnalyzing) {
            throw new Error('正在分析中，请稍候...');
        }

        try {
            this.isAnalyzing = true;
            this.updateLoadingStatus('正在解析消息...');
            
            if (!text || typeof text !== 'string') {
                throw new Error('输入内容不能为空');
            }
            this.log('原始输入:', text);
            
            // 先进行消息解析
            const messages = this.parseMessages(text);
            if (!messages || messages.length === 0) {
                throw new Error('未能识别任何有效的聊天记录，请检查输入格式');
            }
            this.log('解析到消息:', messages);

            // 生成统计数据
            const stats = this.generateStats(messages);
            this.log('统计数据:', stats);

            // 发送给 AI 分析
            this.updateLoadingStatus('正在等待 AI 分析...');
            const aiAnalysis = await this.getAIAnalysis(text);
            if (!aiAnalysis?.choices?.[0]?.message?.content) {
                throw new Error('AI 返回数据格式错误');
            }
            this.log('AI分析结果:', aiAnalysis);

            // 格式化结果
            this.updateLoadingStatus('正在生成报告...');
            const result = this.formatResults(stats, aiAnalysis);
            this.log('格式化结果:', result);
            return result;
        } finally {
            this.isAnalyzing = false;
            this.updateLoadingStatus('');
        }
    }

    async getAIAnalysis(messages) {
        try {
            const requestData = {
                model: "deepseek-chat",
                messages: [{
                    role: "system",
                    content: `你是一个专业的对话分析专家。请对以下对话进行分析，并在最后附加计算所需的量化分数。

///基础情感分析///
- 情感评分: [0-100分，具体分段如下：
  * 0-20: 非常消极或冷淡的对话
  * 21-40: 偏消极或疏离的对话
  * 41-60: 中性或一般的日常对话
  * 61-80: 偏积极或友好的对话
  * 81-100: 非常积极或热络的对话]
- 情感基调: [用3-4个客观的形容词描述]
- 情感强度: [1-5级]
- 情感波动: [描述关键情绪变化]
- 互动热度: [1-5级]
- 浪漫/暧昧张力: [0-10分]

///话题分析///
- 主要话题: [列出具体话题]
- 话题分类: [工作/学习/生活/情感等]
- 话题深度: [1-5级]
- 话题转换: [描述频率和自然度]
- 共同兴趣: [重复出现的话题]
- 话题参与度: [描述各方参与情况]

///社交关系分析///
- 关系亲密度: [1-5级]
- 互动模式: [单向/双向、主动/被动等]
- 关系阶段: [初识/暧昧/正式交往/深入交往/有矛盾/疏远]
- 关系特点: [显著特征]
- 浪漫可能性: [0-5分]

///语言特征分析///
- 用语风格: [正式/随意、礼貌/随性等]
- 表情使用: [分析表情符号使用特点]
- 语气词: [分析语气词使用特点]
- 特殊表达: [网络用语、方言等]

///行为模式分析///
- 主动性: [分析谁更主动]
- 回应特点: [分析回应的特点]
- 关心行为: [分析关心行为表现]
- 互动问题: [发现的问题或冲突]

///改善建议///
- 关系建议: [改善关系的建议]
- 沟通建议: [改善沟通的建议]
- 话题建议: [建议探讨的话题]
- 行为建议: [改善互动的建议]
- 个性化建议: [针对性建议]

注意事项：
1. 严格基于对话内容进行分析，避免过度推测
2. 评分必须符合标准，不得随意给分
3. 分析要客观中立，避免主观判断
4. 所有结论必须有对话内容支持
5. 如果信息不足，应该说明"信息不足以判断"而不是强行推测
6. 特别关注可能表明关系发展的细节
7. 注意分析称谓、语气等暗示性内容

///量化评分///
- Positivity_Score: [1-10，正面—负面评分]
- Intimacy_Score: [1-10，亲密—疏远评分]
- Accord_Score: [1-10，共鸣—冲突评分]
- Enthusiasm_Score: [1-10，热情—冷淡评分]
- Trust_Score: [1-10，信任—怀疑评分]
- Romance_Score: [1-10，浪漫/暧昧张力评分]
- Relationship_Type: ["social"或"romantic"，用于确定权重方案]

注意：量化评分部分必须严格按照以上格式返回，确保数字可被程序识别。`
                }, {
                    role: "user",
                    content: `请分析这段对话:\n${messages}`
                }],
                stream: false,
                max_tokens: 8192,
                temperature: 0.7,
                top_p: 0.9,
                presence_penalty: 0.1,
                frequency_penalty: 0.1
            };

            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${CONFIG.API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            const responseText = await response.text();
            
            // 在调试面板显示 AI 返回数据
            if (this.debugOutput) {
                const time = new Date().toLocaleTimeString();
                this.debugOutput.innerHTML = `[${time}] AI 返回数据:\n${responseText}\n`;
                this.debugOutput.scrollTop = this.debugOutput.scrollHeight;
            }

            if (!response.ok) {
                throw new Error(`API错误 (${response.status}): ${responseText}`);
            }

            return JSON.parse(responseText);
        } catch (error) {
            throw error;
        }
    }

    parseMessages(text) {
        if (!text) return [];
        
        this.log('开始解析消息');
        const messages = [];
        
        // 分行并过滤空行
        const lines = text.split('\n').filter(line => line.trim());
        
        lines.forEach((line, index) => {
            this.log(`处理第 ${index + 1} 行:`, line);
            
            try {
                // 跳过日期分隔行
                if (line.includes('*')) {
                    this.log('跳过日期分隔行:', line);
                    return;
                }

                // 匹配消息
                const messageMatch = line.match(this.messagePattern);
                if (messageMatch) {
                    const message = {
                        sender: messageMatch[1].trim(),
                        content: messageMatch[2].trim(),
                        type: this.getMessageType(messageMatch[2])
                    };
                    this.log('解析到消息:', message);
                    messages.push(message);
                } else {
                    this.log('无法匹配的行:', line);
                }
            } catch (error) {
                this.log(`解析第 ${index + 1} 行时出错:`, error);
            }
        });

        this.log('解析完成，消息数:', messages.length);
        return messages;
    }

    getMessageType(content) {
        if (content.includes('[表情包]') || content.includes('💔') || content.includes('💢') || 
            content.includes('[流泪]') || content.includes('[爱心]')) return 'emoji';
        if (content.includes('[图片]')) return 'image';
        if (content.includes('引用:')) return 'quote';
        return 'text';
    }

    generateStats(messages) {
        const stats = {
            totalMessages: messages.length,
            userStats: {},
            messageTypes: {
                text: 0,
                emoji: 0,
                image: 0,
                quote: 0
            }
        };

        messages.forEach(msg => {
            // 用户统计
            if (!stats.userStats[msg.sender]) {
                stats.userStats[msg.sender] = {
                    messages: 0,
                    types: {...stats.messageTypes}
                };
            }
            stats.userStats[msg.sender].messages++;
            stats.userStats[msg.sender].types[msg.type]++;

            // 消息类型统计
            stats.messageTypes[msg.type]++;
        });

        return stats;
    }

    formatResults(stats, aiAnalysis) {
        const content = aiAnalysis.choices[0].message.content;
        
        // 首先计算情感得分
        const emotionCalc = this.calculateEmotionScore(content);
        
        // 生成情感计算详情的 HTML
        const emotionDetails = `
            <div class="p-4 bg-white rounded-lg shadow mb-4">
                <h3 class="font-bold mb-2">情感计算详情 4.0</h3>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <h4 class="font-medium">情感维度 (60%)</h4>
                        <ul class="list-none space-y-1">
                            <li>情感评分: ${emotionCalc.dimensions.emotion.ES}/100 (权重60%)</li>
                            <li>情感强度: ${emotionCalc.dimensions.emotion.EI}/5 (参考指标)</li>
                            <li>浪漫可能性: ${emotionCalc.dimensions.emotion.RP}/5 (权重40%)</li>
                            <li class="mt-2 font-medium">维度得分: ${emotionCalc.dimensions.emotion.score.toFixed(2)}</li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-medium">关系维度 (40%)</h4>
                        <ul class="list-none space-y-1">
                            <li>关系亲密度: ${emotionCalc.dimensions.relation.IR}/5 (权重50%)</li>
                            <li>话题深度: ${emotionCalc.dimensions.relation.TD}/5 (权重30%)</li>
                            <li>话题参与度: ${emotionCalc.dimensions.relation.TP}/5 (权重20%)</li>
                            <li class="mt-2 font-medium">维度得分: ${emotionCalc.dimensions.relation.score.toFixed(2)}</li>
                        </ul>
                    </div>
                </div>
                <div class="mt-4">
                    <h4 class="font-medium">计算过程</h4>
                    <pre class="text-sm bg-gray-50 p-2 rounded overflow-x-auto">
1. 情感维度得分 (60%权重):
得分 = (情感评分/100 × 60) + (浪漫可能性/5 × 40)
    = (${emotionCalc.dimensions.emotion.ES}/100 × 60) + (${emotionCalc.dimensions.emotion.RP}/5 × 40)
    = ${emotionCalc.dimensions.emotion.score.toFixed(2)}

2. 关系维度得分 (40%权重):
得分 = (关系亲密度/5 × 50) + (话题深度/5 × 30) + (话题参与度/5 × 20)
    = (${emotionCalc.dimensions.relation.IR}/5 × 50) + (${emotionCalc.dimensions.relation.TD}/5 × 30) + (${emotionCalc.dimensions.relation.TP}/5 × 20)
    = ${emotionCalc.dimensions.relation.score.toFixed(2)}

3. 最终得分:
Score = 情感维度 × 0.6 + 关系维度 × 0.4
      = ${emotionCalc.dimensions.emotion.score.toFixed(2)} × 0.6 + ${emotionCalc.dimensions.relation.score.toFixed(2)} × 0.4
      = ${emotionCalc.totalScore}
                    </pre>
                </div>
            </div>
        `;

        // 更新匹配模式，使用更精确的正则表达式
        const sections = {
            基础情感分析: content.match(/\/\/\/基础情感分析\/\/\/([\s\S]*?)(?=\/\/\/话题分析|$)/)?.[1]?.trim() || '未获取到分析结果',
            话题分析: content.match(/\/\/\/话题分析\/\/\/([\s\S]*?)(?=\/\/\/社交关系分析|$)/)?.[1]?.trim() || '未获取到分析结果',
            社交关系分析: content.match(/\/\/\/社交关系分析\/\/\/([\s\S]*?)(?=\/\/\/语言特征分析|$)/)?.[1]?.trim() || '未获取到分析结果',
            语言特征分析: content.match(/\/\/\/语言特征分析\/\/\/([\s\S]*?)(?=\/\/\/行为模式分析|$)/)?.[1]?.trim() || '未获取到分析结果',
            行为模式分析: content.match(/\/\/\/行为模式分析\/\/\/([\s\S]*?)(?=\/\/\/改善建议|$)/)?.[1]?.trim() || '未获取到分析结果',
            改善建议: content.match(/\/\/\/改善建议\/\/\/([\s\S]*?)(?=\/\/\/量化评分|$)/)?.[1]?.trim() || '未获取到分析结果'
        };

        // 生成各部分的 HTML
        const sectionsHtml = Object.entries(sections).map(([key, value]) => {
            if (!value || value === '未获取到分析结果') return '';
            
            return `
                <div class="p-4 bg-white rounded-lg shadow mb-4">
                    <h3 class="font-bold mb-2">${key}</h3>
                    <div class="prose">
                        ${value.split('\n').map(line => {
                            if (!line.trim()) return '';
                            const parts = line.split(':');
                            if (parts.length < 2) return `<p class="text-gray-700">${line}</p>`;
                            
                            const [title, ...contentParts] = parts;
                            const content = contentParts.join(':').trim();
                            
                            return `
                                <div class="mb-2">
                                    <span class="font-medium">${title.trim()}:</span>
                                    <span class="text-gray-700">${content}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');

        // 返回完整的 HTML
        return `
            <div class="space-y-4">
                <!-- 统计数据和评分 -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div class="p-4 bg-blue-50 rounded-lg">
                        <h3 class="font-bold mb-2">统计数据</h3>
                        <p>总消息数: ${stats.totalMessages}</p>
                        ${this.formatUserStats(stats.userStats)}
                    </div>
                    
                    <div class="p-4 bg-green-50 rounded-lg">
                        <h3 class="font-bold mb-2">情感评分</h3>
                        <div class="relative w-full h-4 bg-gray-200 rounded">
                            <div class="absolute top-0 left-0 h-full bg-blue-500 rounded" 
                                 style="width: ${emotionCalc.totalScore}%"></div>
                        </div>
                        <p class="text-sm text-gray-600 mt-1">综合得分：${emotionCalc.totalScore}/100</p>
                    </div>
                </div>

                <!-- 情感计算详情 -->
                ${emotionDetails}

                <!-- 分析结果各部分 -->
                ${sectionsHtml}
            </div>
        `;
    }

    formatUserStats(userStats) {
        return Object.entries(userStats).map(([user, data]) => `
            <div class="mb-2">
                <p class="font-medium">${user}</p>
                <p class="ml-4">消息数: ${data.messages}</p>
                <p class="ml-4">类型分布: 
                    文本(${data.types.text}) 
                    表情(${data.types.emoji}) 
                    图片(${data.types.image}) 
                    引用(${data.types.quote})
                </p>
            </div>
        `).join('');
    }

    formatDateStats(dateStats) {
        return Object.entries(dateStats).map(([date, count]) => `
            <p>${date}: ${count}条消息</p>
        `).join('');
    }

    // 修改情感得分计算方法
    calculateEmotionScore(content) {
        // 提取基础分数
        const scores = {
            // 情感维度 (60%)
            ES: this.extractNumberFromText(content, '情感评分: ', 100),  // 情感评分
            EI: this.extractNumberFromText(content, '情感强度: ', 5),    // 情感强度(仅作参考)
            RP: this.extractNumberFromText(content, '浪漫可能性: ', 5),  // 浪漫可能性

            // 关系维度 (40%)
            IR: this.extractNumberFromText(content, '关系亲密度: ', 5),  // 关系亲密度
            TD: this.extractNumberFromText(content, '话题深度: ', 5),    // 话题深度
            TP: this.extractTopicParticipation(content)                 // 话题参与度
        };

        // 计算情感维度得分 (满分100)
        const emotionScore = (
            (scores.ES / 100 * 60) +  // 情感评分占60%
            (scores.RP / 5 * 40)      // 浪漫可能性占40%
        );

        // 计算关系维度得分 (满分100)
        const relationScore = (
            (scores.IR / 5 * 50) +    // 关系亲密度占50%
            (scores.TD / 5 * 30) +    // 话题深度占30%
            (scores.TP / 5 * 20)      // 话题参与度占20%
        );

        // 计算最终得分
        const finalScore = Math.round(
            emotionScore * 0.6 +      // 情感维度占60%
            relationScore * 0.4        // 关系维度占40%
        );

        return {
            totalScore: Math.min(100, finalScore),  // 只限制最高分为100
            dimensions: {
                emotion: {
                    ES: scores.ES,
                    EI: scores.EI,     // 保留但不计入得分
                    RP: scores.RP,
                    score: emotionScore
                },
                relation: {
                    IR: scores.IR,
                    TD: scores.TD,
                    TP: scores.TP,
                    score: relationScore
                }
            }
        };
    }

    // 新增：从文本中提取数字的辅助方法
    extractNumberFromText(text, prefix, defaultMax) {
        this.log(`尝试提取 ${prefix} 的数值`);
        
        // 处理特殊情况：评分后带有"分"字
        if (prefix === '情感评分: ') {
            const match = text.match(new RegExp(prefix + '(\\d+)分?'));
            if (match) {
                const value = parseInt(match[1]);
                this.log(`找到数值: ${value}`);
                return value;
            }
        }
        
        // 处理带有"级"或其他后缀的情况
        const match = text.match(new RegExp(prefix + '(\\d+(?:\\.\\d+)?)(?:级|分)?'));
        if (match) {
            const value = parseFloat(match[1]);
            this.log(`找到数值: ${value}`);
            return value;
        }

        this.log(`未找到数值，使用默认值: ${defaultMax/2}`);
        return defaultMax/2;
    }

    // 新增：从话题参与度描述转换为分数
    extractTopicParticipation(content) {
        const participationDesc = content.match(/话题参与度: ([^\\n]+)/)?.[1]?.toLowerCase() || '';
        
        if (participationDesc.includes('积极') || participationDesc.includes('热烈')) return 5;
        if (participationDesc.includes('良好') || participationDesc.includes('频繁')) return 4;
        if (participationDesc.includes('一般') || participationDesc.includes('正常')) return 3;
        if (participationDesc.includes('较少') || participationDesc.includes('被动')) return 2;
        if (participationDesc.includes('冷淡') || participationDesc.includes('消极')) return 1;
        
        return 3; // 默认返回中等水平
    }

    updateLoadingStatus(message) {
        const loadingDiv = document.getElementById('loading');
        if (loadingDiv) {
            const statusText = loadingDiv.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = message;
            }
        }
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成');
    
    const analyzer = new ChatAnalyzer();
    const analyzeBtn = document.getElementById('analyzeBtn');
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');
    const sampleBtn = document.getElementById('sampleBtn');

    if (!analyzeBtn || !resultDiv || !loadingDiv || !sampleBtn) {
        console.error('找不到必要的DOM元素:', {
            analyzeBtn: !!analyzeBtn,
            resultDiv: !!resultDiv,
            loadingDiv: !!loadingDiv,
            sampleBtn: !!sampleBtn
        });
        return;
    }

    // 示例对话按钮点击事件
    sampleBtn.addEventListener('click', () => {
        console.log('点击示例按钮');
        const chatContent = document.getElementById('chatContent');
        if (chatContent) {
            chatContent.value = `********************2024-03-15********************
2024-03-15 08:32:10 小红: 早上好啊
2024-03-15 08:32:30 小明: 早安[表情包]
2024-03-15 08:33:00 小红: [图片]今天天气真好`;
        }
    });

    // 分析按钮点击事件
    analyzeBtn.addEventListener('click', async () => {
        const chatContent = document.getElementById('chatContent');
        if (!chatContent) {
            alert('找不到输入框');
            return;
        }

        const content = chatContent.value?.trim();
        if (!content) {
            alert('请输入聊天记录');
            return;
        }

        loadingDiv.classList.remove('hidden');
        analyzeBtn.disabled = true;
        resultDiv.innerHTML = '<p class="text-gray-500">分析中...</p>';
        resultDiv.classList.remove('hidden');

        try {
            const analyzer = new ChatAnalyzer();
            const result = await analyzer.analyze(content);
            resultDiv.innerHTML = result;
        } catch (error) {
            console.error('分析失败:', error);
            resultDiv.innerHTML = `
                <div class="p-4 bg-red-50 text-red-700 rounded-lg">
                    <h3 class="font-bold mb-2">分析失败</h3>
                    <p class="mb-2">${error.message}</p>
                    <div class="text-sm border-t border-red-200 pt-2 mt-2">
                        <p class="font-medium mb-1">错误详情：</p>
                        <pre class="bg-red-50 p-2 rounded overflow-auto max-h-40 text-xs">${
                            error.stack || JSON.stringify(error, null, 2)
                        }</pre>
                        <p class="mt-2 font-medium">可能的原因：</p>
                        <ul class="list-disc ml-4 mt-1">
                            <li>输入格式不正确（请确保每行都是"发送者：消息内容"的格式）</li>
                            <li>消息内容为空</li>
                            <li>网络连接问题</li>
                            <li>API服务器暂时不可用</li>
                        </ul>
                        <p class="mt-2">如果问题持续存在，请检查输入格式或稍后重试。</p>
                    </div>
                </div>
            `;
        } finally {
            loadingDiv.classList.add('hidden');
            analyzeBtn.disabled = false;
        }
    });

    const debugBtn = document.getElementById('debugBtn');
    const debugOutput = document.getElementById('debugOutput');
    const clearDebug = document.getElementById('clearDebug');

    if (debugBtn && debugOutput && clearDebug) {
        debugBtn.addEventListener('click', () => {
            debugOutput.classList.toggle('hidden');
            debugBtn.textContent = debugOutput.classList.contains('hidden') 
                ? '打开调试面板' 
                : '关闭调试面板';
        });

        clearDebug.addEventListener('click', () => {
            if (document.getElementById('debugContent')) {
                document.getElementById('debugContent').innerHTML = '';
            }
        });
    }

    console.log('事件监听器设置完成');
}); 