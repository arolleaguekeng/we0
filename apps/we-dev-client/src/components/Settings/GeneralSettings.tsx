import useThemeStore from "@/stores/themeSlice";
import { useState, useEffect, useRef } from "react";
import useChatStore from "@/stores/chatSlice";
import i18n from "@/utils/i18";

import { useTranslation } from "react-i18next";
import { Switch, Select, Input, Radio, message } from "antd";
import { BackendSettings } from "./BackendSettings";
import classNames from "classnames";

interface OtherConfig {
  isBackEnd: boolean;
  backendLanguage: string;
  extra: {
    isOpenDataBase: boolean;
    database: string;
    databaseConfig: {
      url: string;
      username: string;
      password: string;
    };
    isOpenCache: boolean;
    cache: string;
  };
}

interface FormData {
  language?: string;
  ollamaUrl?: string;
  apiKey?: string;
  proxyType: "none" | "system" | "custom";
  customProxy: string;
  pythonMirror: string;
  customPythonMirror: string;
  nodeMirror: string;
  customNodeMirror: string;
}

// 自定义 Select 组件
const CustomSelect = ({ value, onChange, options, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative" ref={selectRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={classNames(
          "w-full px-3 py-2 text-sm text-left rounded-md",
          "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
          "hover:bg-gray-50 dark:hover:bg-gray-700/50",
          "focus:outline-none focus:ring-2 focus:ring-purple-500/50",
          "transition-colors duration-200",
          "flex items-center justify-between gap-2",
          className
        )}
      >
        <span className="truncate">{selectedOption?.label}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className={classNames(
            "absolute z-50 w-full mt-1 rounded-md shadow-lg",
            "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
            "max-h-60 overflow-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
          )}
        >
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={classNames(
                "w-full px-3 py-2 text-sm text-left",
                "hover:bg-gray-50 dark:hover:bg-gray-700/50",
                "transition-colors duration-200",
                value === option.value &&
                  "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// 自定义 Input 组件
const CustomInput = ({ value, onChange, placeholder, className = "" }) => (
  <input
    type="text"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={classNames(
      "w-full px-3 py-2 text-sm rounded-md",
      "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
      "focus:outline-none focus:ring-2 focus:ring-purple-500/50",
      "placeholder-gray-400 dark:placeholder-gray-500",
      "transition-colors duration-200",
      className
    )}
  />
);

// 添加自定义 Radio 组件
const CustomRadio = ({ checked, onChange, children, value }) => (
  <button
    onClick={() => onChange({ target: { value } })}
    className={classNames(
      "flex items-center gap-2 px-3 py-2 w-full text-sm rounded-md",
      "transition-colors duration-200",
      checked
        ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800"
        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700",
      "border hover:bg-gray-50 dark:hover:bg-gray-700/50"
    )}
  >
    <div
      className={classNames(
        "w-4 h-4 rounded-full border-2 flex items-center justify-center",
        checked
          ? "border-purple-500 dark:border-purple-400"
          : "border-gray-300 dark:border-gray-600"
      )}
    >
      {checked && (
        <div className="w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400" />
      )}
    </div>
    <span>{children}</span>
  </button>
);

// 添加自定义多行输入框组件
const CustomTextArea = ({ value, onChange, placeholder, className = "" }) => (
  <textarea
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    rows={4}
    className={classNames(
      "w-full px-3 py-2 text-sm rounded-md",
      "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
      "focus:outline-none focus:ring-2 focus:ring-purple-500/50",
      "placeholder-gray-400 dark:placeholder-gray-500",
      "transition-colors duration-200",
      "resize-y min-h-[100px]",
      className
    )}
  />
);

export function GeneralSettings() {
  const { t } = useTranslation();
  const { setOtherConfig, otherConfig } = useChatStore();
  const { isDarkMode, toggleTheme, setTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState("general");
  const [formData, setFormData] = useState<FormData>(() => {
    const savedData = JSON.parse(
      localStorage.getItem("settingsConfig") || "{}"
    );
    return {
      ...savedData,
      proxyType: savedData.proxyType || "none",
      customProxy: savedData.customProxy || "",
      pythonMirror: savedData.pythonMirror || "https://pypi.org/simple",
      customPythonMirror: savedData.customPythonMirror || "",
      nodeMirror: savedData.nodeMirror || "https://registry.npmjs.org/",
      customNodeMirror: savedData.customNodeMirror || "",
      language: savedData.language || "en",
    };
  });

  const [showPassword, setShowPassword] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(
    localStorage.getItem("theme") || "system"
  );

  useEffect(() => {
    localStorage.setItem("settingsConfig", JSON.stringify(formData));
  }, [formData]);

  // Load theme settings from local storage when component mounts
  useEffect(() => {
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (currentTheme === "system") {
        setTheme(e.matches);
      }
    };

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", handleSystemThemeChange);

    // 初始化主题
    if (currentTheme === "system") {
      setTheme(mediaQuery.matches);
    } else {
      setTheme(currentTheme === "dark");
    }

    return () =>
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, [currentTheme]);

  useEffect(() => {
    const savedOtherConfig = localStorage.getItem("otherConfig");
    if (savedOtherConfig) {
      try {
        const config = JSON.parse(savedOtherConfig);
        setOtherConfig({
          isBackEnd: config.isBackEnd || false,
          backendLanguage: config.backendLanguage || "java",
          extra: {
            isOpenDataBase: config.extra?.database !== "none",
            database: config.extra?.database || "mysql",
            databaseConfig: {
              url: config.extra?.databaseConfig?.url || "",
              username: config.extra?.databaseConfig?.username || "",
              password: config.extra?.databaseConfig?.password || "",
            },
            isOpenCache: config.extra?.isOpenCache || false,
            cache: config.extra?.cache || "",
          },
        });
      } catch (error) {
        setOtherConfig({
          isBackEnd: false,
          backendLanguage: "java",
          extra: {
            isOpenDataBase: false,
            database: "mysql",
            databaseConfig: {
              url: "",
              username: "",
              password: "",
            },
            isOpenCache: false,
            cache: "",
          },
        });
        localStorage.removeItem("otherConfig");
      }
    } else {
      setOtherConfig({
        isBackEnd: false,
        backendLanguage: "java",
        extra: {
          isOpenDataBase: false,
          database: "mysql",
          databaseConfig: {
            url: "",
            username: "",
            password: "",
          },
          isOpenCache: false,
          cache: "",
        },
      });
    }
  }, []);

  const updateConfig = (newConfig: any) => {
    setOtherConfig(newConfig);
    localStorage.setItem("otherConfig", JSON.stringify(newConfig));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const newConfig: OtherConfig = {
        isBackEnd: otherConfig.isBackEnd || false,
        backendLanguage: otherConfig.backendLanguage || "java",
        extra: {
          isOpenDataBase: otherConfig.extra?.database !== "none",
          database: otherConfig.extra?.database || "mysql",
          databaseConfig: {
            url: otherConfig.extra?.databaseConfig?.url || "",
            username: otherConfig.extra?.databaseConfig?.username || "",
            password: otherConfig.extra?.databaseConfig?.password || "",
          },
          isOpenCache: false,
          cache: "",
        },
      };
      localStorage.setItem("otherConfig", JSON.stringify(newConfig));
      setOtherConfig(newConfig);
      localStorage.setItem(
        "ollamaConfig",
        JSON.stringify({
          url: formData.ollamaUrl || "http://localhost:11434",
          apiKey: formData.apiKey,
        })
      );
    } catch (error) {
      localStorage.setItem(
        "ollamaConfig",
        JSON.stringify({
          url: formData.ollamaUrl || "http://localhost:11434",
          apiKey: formData.apiKey,
        })
      );
    }
  };

  const handleThemeChange = (theme: string) => {
    setCurrentTheme(theme);
    localStorage.setItem("theme", theme);

    if (theme === "system") {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      setTheme(prefersDark);
    } else {
      setTheme(theme === "dark");
    }
  };

  // 验证代理地址格式
  const validateProxyUrl = (url: string): boolean => {
    try {
      // 检查基本格式
      if (!url.includes("://")) {
        message.error(t("settings.invalidProxyFormat"));
        return false;
      }

      // 获取协议和剩余部分
      const [protocol, rest] = url.split("://");
      const protocolLower = protocol.toLowerCase();
      const supportedProtocols = ["http", "https", "socks4", "socks5"];

      if (!supportedProtocols.includes(protocolLower)) {
        message.error(t("settings.unsupportedProxyProtocol"));
        return false;
      }

      if (protocolLower.startsWith("socks")) {
        // SOCKS 代理验证
        const socksRegex = /^([^:]+)(?::(\d+))?$/;
        const match = rest.match(socksRegex);

        if (!match) {
          message.error(t("settings.invalidProxyFormat"));
          return false;
        }

        const [, host, port] = match;

        // 检查主机
        if (!host) {
          message.error(t("settings.invalidProxyHost"));
          return false;
        }

        // SOCKS 代理必须有端口
        if (!port) {
          message.error(t("settings.socksPortRequired"));
          return false;
        }

        // 验证端口号
        const portNum = parseInt(port, 10);
        if (isNaN(portNum) || portNum <= 0 || portNum > 65535) {
          message.error(t("settings.invalidProxyPort"));
          return false;
        }
      } else {
        // HTTP/HTTPS 代理验证
        try {
          const proxyUrl = new URL(url);

          if (!proxyUrl.hostname) {
            message.error(t("settings.invalidProxyHost"));
            return false;
          }

          if (proxyUrl.port) {
            const portNum = parseInt(proxyUrl.port, 10);
            if (isNaN(portNum) || portNum <= 0 || portNum > 65535) {
              message.error(t("settings.invalidProxyPort"));
              return false;
            }
          }
        } catch (e) {
          message.error(t("settings.invalidProxyFormat"));
          return false;
        }
      }

      return true;
    } catch (e) {
      console.error("Proxy validation error:", e);
      message.error(t("settings.invalidProxyFormat"));
      return false;
    }
  };

  // 处理代理类型切换
  const handleProxyTypeChange = (
    newProxyType: "none" | "system" | "custom"
  ) => {
    // 保存当前状态到新对象，避免直接修改当前状态
    const newFormData = {
      ...formData,
      proxyType: newProxyType,
    };

    // 更新状态
    setFormData(newFormData);

    // 应用新的代理设置
    if (newProxyType === "custom") {
      // 如果切换到自定义代理且有保存的值，立即应用
      if (formData.customProxy) {
        applyProxySettings(newProxyType, formData.customProxy);
      }
    } else {
      // 非自定义代理直接应用
      applyProxySettings(newProxyType);
    }
  };

  // 应用代理设置
  const applyProxySettings = (proxyType: string, customProxy?: string) => {
    try {
      // 对于自定义代理，验证URL格式
      if (proxyType === "custom" && customProxy) {
        if (!validateProxyUrl(customProxy)) {
          return;
        }
      }

      // 在 Web 环境中设置代理
      console.log("Web environment proxy settings will be handled by browser");
      message.success(t("settings.proxyApplied"));
    } catch (error) {
      console.error("Failed to apply proxy settings:", error);
      message.error(t("settings.proxyError"));
    }
  };

  // 处理自定义代理值变更
  const handleCustomProxyChange = (newProxy: string) => {
    // 更新表单状态
    setFormData((prev) => ({
      ...prev,
      customProxy: newProxy,
    }));

    // 使用防抖处理，避免频繁应用设置
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      if (newProxy) {
        applyProxySettings("custom", newProxy);
      }
    }, 500);
  };

  // 创建一个ref存储防抖定时器
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // 组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Language Select
  const handleLanguageChange = (language: string) => {
    setFormData({ ...formData, language });
    i18n.changeLanguage(language);
    localStorage.setItem("language", language);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1">
        {/* 标签页切换 */}
        <nav className="border-b border-gray-200 dark:border-gray-700">
          <button
            className={classNames(
              "px-4 py-2 text-sm font-medium transition-colors duration-200",
              "focus:outline-none",
              activeTab === "general"
                ? "border-b-2 border-purple-500 text-purple-600 dark:text-purple-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            )}
            onClick={() => setActiveTab("general")}
          >
            {t("settings.General")}
          </button>
        </nav>

        {/* 设置表单 */}
        <div className="p-4 space-y-6">
          <BackendSettings
            otherConfig={otherConfig}
            updateConfig={updateConfig}
          />

          {/* 主题切换 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("settings.themeMode")}
            </label>
            <CustomSelect
              value={currentTheme}
              onChange={(value) => handleThemeChange(value)}
              options={[
                { value: "light", label: t("settings.themeModeLight") },
                { value: "dark", label: t("settings.themeModeDark") },
              ]}
            />
          </div>

          {/* 语言选择 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("settings.Language")}
            </label>
            <CustomSelect
              value={formData.language}
              onChange={(value) => handleLanguageChange(value)}
              options={[
                { value: "en", label: "English" },
                { value: "zh", label: "中文" },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
