function FindProxyForURL(url, host) {
    // 代理服务器配置（仅保留单节点）
    const TARGET_PROXY = "PROXY 192.168.1.55:10808";
    const DIRECT = "DIRECT";
    
    // 精确匹配本地地址规则
    const localDomains = ["localhost", "127.0.0.1", "::1"];
    const localNets = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"];
    
    // 基础检测函数
    function isLocalHost(host) {
        return localDomains.includes(host) || 
               isInNet(host, "127.0.0.1", "255.0.0.0") ||
               isInNet(host, "::1", "ffff:ffff:ffff:ffff::");
    }

    // 代理连通性检测（带超时控制）
    async function checkProxyLatency() {
        const testUrl = "http://192.168.1.55:10808/ping"; // 假设代理有健康检查接口
        const timeout = 2000; // 2秒超时
        
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(testUrl, {
                method: 'HEAD',
                signal: controller.signal,
                mode: 'no-cors'
            });
            
            clearTimeout(timer);
            return response ? 100 : Infinity; // 返回模拟延迟值
        } catch (e) {
            return Infinity;
        }
    }

    // 主决策逻辑
    (async function() {
        // 本地地址直连
        if (isPlainHostName(host) || 
            isLocalHost(host) || 
            isInNet(host, "10.0.0.0", "255.0.0.0") ||
            isInNet(host, "172.16.0.0", "255.240.0.0") ||
            isInNet(host, "192.168.0.0", "255.255.0.0")) {
            return DIRECT;
        }

        // 代理服务器连通性检测
        const latency = await checkProxyLatency();
        
        // 根据延迟动态选择
        if (latency <= 500) { // 阈值可根据实际调整
            return TARGET_PROXY;
        } else {
            // 检测直连可行性
            try {
                const directTest = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
                return directTest ? DIRECT : TARGET_PROXY; // 保底使用代理
            } catch (e) {
                return TARGET_PROXY; // 网络异常时仍走代理
            }
        }
    })();
}
