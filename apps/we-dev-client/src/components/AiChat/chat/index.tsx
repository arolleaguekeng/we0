import {useEffect, useMemo, useRef, useState} from "react";
import {Message, useChat} from "ai/react";
import {toast} from "react-toastify";
import {uploadImage} from "@/api/chat";
import useChatStore from "../../../stores/chatSlice";
import {useFileStore} from "../../WeIde/stores/fileStore";
import {db} from "../../../utils/indexDB";
import {v4 as uuidv4} from "uuid";
import {eventEmitter} from "../utils/EventEmitter";
import {MessageItem} from "./components/MessageItem";
import {ChatInput, ChatMode} from "./components/ChatInput";
import Tips from "./components/Tips";
import {parseMessage} from "../../../utils/messagepParseJson";
import useUserStore from "../../../stores/userSlice";
import {useLimitModalStore} from "../../UserModal";
import {updateFileSystemNow} from "../../WeIde/services";
import {parseMessages} from "../useMessageParser";
import {createMpIcon} from "@/utils/createWtrite";
import {useTranslation} from "react-i18next";
import useChatModeStore from "../../../stores/chatModeSlice";
import useTerminalStore from "@/stores/terminalSlice";
import {checkExecList, checkFinish} from "../utils/checkFinish";
import {useUrlData} from "@/hooks/useUrlData";
import {getProjectById} from "@/api/persistence/db";
import {WebGenService} from "./services/appGenService";
import {MCPTool} from "@/types/mcp";
import useMCPTools from "@/hooks/useMCPTools";

type WeMessages = (Message & {
    experimental_attachments?: Array<{
        id: string;
        name: string;
        type: string;
        localUrl: string;
        contentType: string;
        url: string;
    }>
})[]
type TextUIPart = {
    type: 'text';
    /**
     * The text content.
     */
    text: string;
};
// Version web - pas d'ipcRenderer
export const excludeFiles = [
    "components/weicon/base64.js",
    "components/weicon/icon.css",
    "components/weicon/index.js",
    "components/weicon/index.json",
    "components/weicon/index.wxml",
    "components/weicon/icondata.js",
    "components/weicon/index.css",
    "/miniprogram/components/weicon/base64.js",
    "/miniprogram/components/weicon/icon.css",
    "/miniprogram/components/weicon/index.js",
    "/miniprogram/components/weicon/index.json",
    "/miniprogram/components/weicon/index.wxml",
    "/miniprogram/components/weicon/icondata.js",
    "/miniprogram/components/weicon/index.css",
];

const API_BASE = process.env.APP_BASE_URL;
console.log(API_BASE, 'API_BASE')

enum ModelTypes {
    Gemini25Flash = "gemini-2.5-flash",
    Claude37sonnet = "claude-3-7-sonnet-20250219",
    Claude35sonnet = "claude-3-5-sonnet-20240620",
    gpt4oMini = "gpt-4o-mini",
    DeepseekR1 = "DeepSeek-R1",
    DeepseekV3 = "deepseek-chat",
}

export interface IModelOption {
    value: string;
    label: string;
    useImage: boolean;
    quota: number;
    from?: string;
    icon?: React.FC<React.SVGProps<SVGSVGElement>>;
    provider?: string;
    functionCall?: boolean;
}

function convertToBoltAction(obj: Record<string, string>): string {
    return Object.entries(obj)
        .filter(([filePath]) => !excludeFiles.includes(filePath))
        .map(
            ([filePath, content]) =>
                `<boltAction type="file" filePath="${filePath}">\n${content}\n</boltAction>`
        )
        .join("\n\n");
}

export const BaseChat = ({uuid: propUuid}: { uuid?: string }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const {otherConfig} = useChatStore();
    const {t} = useTranslation();
    const [checkCount, setCheckCount] = useState(0);
    const [visible, setVisible] = useState(false);
    const [baseModal, setBaseModal] = useState<IModelOption>({
        value: ModelTypes.Gemini25Flash,
        label: "Gemini 2.5 Flash",
        useImage: true,
        from: "default",
        quota: 2,
        functionCall: true,
    });
    const {
        files,
        isFirstSend,
        isUpdateSend,
        setIsFirstSend,
        setIsUpdateSend,
        setFiles,
        setEmptyFiles,
        errors,
        updateContent,
        clearErrors,
        setOldFiles
    } = useFileStore();
    const {mode} = useChatModeStore();
    // use global state
    const {
        uploadedImages,
        addImages,
        removeImage,
        clearImages,
        setModelOptions,
    } = useChatStore();
    const {resetTerminals} = useTerminalStore();
    const filesInitObj = {} as Record<string, string>;
    const filesUpdateObj = {} as Record<string, string>;
    Object.keys(isFirstSend).forEach((key) => {
        isFirstSend[key] && (filesInitObj[key] = files[key]);
    });
    Object.keys(isUpdateSend).forEach((key) => {
        isUpdateSend[key] && (filesUpdateObj[key] = files[key]);
    });

    const initConvertToBoltAction = convertToBoltAction({
        ...filesInitObj,
        ...filesUpdateObj,
    });

    const updateConvertToBoltAction = convertToBoltAction(filesUpdateObj);

    // use ollama model to get model list
    useEffect(() => {
        fetch(`${API_BASE}/api/model`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        })
            .then((res) => res.json())
            .then((data) => {
                setModelOptions(data);
            })
            .catch((error) => {
                console.error("Failed to fetch model list:", error);
            });
    }, []);

    useEffect(() => {
        if (
            (messages.length === 0 &&
                initConvertToBoltAction &&
                mode === ChatMode.Builder) ||
            (messages.length === 1 &&
                messages[0].id === "1" &&
                initConvertToBoltAction &&
                mode === ChatMode.Builder)
        ) {
            setMessagesa([
                {
                    id: "1",
                    role: "user",
                    content: `<boltArtifact id="hello-js" title="the current file">\n${initConvertToBoltAction}\n</boltArtifact>\n\n`,
                },
            ]);
            setMessages([
                {
                    id: "1",
                    role: "user",
                    content: `<boltArtifact id="hello-js" title="the current file">\n${initConvertToBoltAction}\n</boltArtifact>\n\n`,
                },
            ])
            scrollToBottom();
        }
    }, [initConvertToBoltAction]);

    useEffect(() => {
        if (
            messages.length > 1 &&
            updateConvertToBoltAction &&
            mode === ChatMode.Builder
        ) {
            setMessages((list) => {
                const newList = [...list];
                if (newList[newList.length - 1].id !== "2") {
                    newList.push({
                        id: "2",
                        role: "user",
                        content: `<boltArtifact id="hello-js" title="Currently modified files">\n${updateConvertToBoltAction}\n</boltArtifact>\n\n`,
                    });
                } else if (newList[newList.length - 1].id === "2") {
                    newList[newList.length - 1].content =
                        `<boltArtifact id="hello-js" title="Currently modified files">\n${updateConvertToBoltAction}\n</boltArtifact>\n\n`;
                }
                scrollToBottom();
                return newList;
            });
        }
    }, [updateConvertToBoltAction]);

    // modify UUID initialization logic and message loading
    const [chatUuid, setChatUuid] = useState(() => propUuid || uuidv4());

    const refUuidMessages = useRef([]);

    useEffect(() => {
        if (checkCount >= 1) {
            checkFinish(messages[messages.length - 1].content, append, t);
            checkExecList(messages);
            setCheckCount(0);
        }
    }, [checkCount]);

    // add function to load chat history
    const loadChatHistory = async (uuid: string) => {
        try {
            const records = await db.getByUuid(uuid);
            if (records.length > 0) {
                const latestRecord = records[0];
                if (latestRecord?.data?.messages) {
                    const historyFiles = {};
                    const oldHistoryFiles = {};
                    // setEmptyFiles();
                    // Version web - pas de manipulation du chemin via ipcRenderer
                    console.log(latestRecord, 'latestRecord')
                    latestRecord.data.messages.forEach((message) => {
                        const {files: messageFiles} = parseMessage(message.content);
                        Object.assign(historyFiles, messageFiles);
                    });
                    const assistantRecord = latestRecord.data.messages.filter(e => e.role === "assistant")
                    if (assistantRecord.length > 1) {
                        const oldRecords = assistantRecord[1];
                        console.log(oldRecords, 'oldRecords')
                        const {files: messageFiles} = parseMessage(oldRecords.content);
                        Object.assign(oldHistoryFiles, messageFiles);
                    }
                    if (mode === ChatMode.Builder) {
                        latestRecord.data.messages.push({
                            id: uuidv4(),
                            role: "user",
                            content: `<boltArtifact id="hello-js" title="the current file">\n${convertToBoltAction(historyFiles)}\n</boltArtifact>\n\n`,
                        });
                    }
                    setMessages(latestRecord.data.messages);
                    setFiles(historyFiles);
                    setOldFiles(oldHistoryFiles);
                    // Reset other states
                    clearImages();
                    setIsFirstSend();
                    setIsUpdateSend();
                    resetTerminals();
                }
            } else {
                // If it's a new conversation, clear all states
                setMessages([]);
                clearImages();
                setIsFirstSend();
                setIsUpdateSend();
            }
        } catch (error) {
            console.error("Failed to load chat history:", error);
            toast.error("Failed to load chat history");
        }
    };

    // listen to chat selection event
    useEffect(() => {
        const unsubscribe = eventEmitter.on("chat:select", (uuid: string) => {
            if (uuid !== chatUuid) {
                refUuidMessages.current = [];
                setChatUuid(uuid || uuidv4());
                if (uuid) {
                    // load chat history
                    loadChatHistory(uuid);
                } else {
                    // new conversation, clear all states
                    setMessages([]);
                    setFiles({});
                    clearImages();
                    setIsFirstSend();
                    setIsUpdateSend();
                    // Version web - opérations de réinitialisation
                    setEmptyFiles();
                    setFiles({});
                    clearImages();
                    setIsFirstSend();
                    setIsUpdateSend();
                    resetTerminals();
                }
            }
        });

        // clean up subscription
        return () => unsubscribe();
    }, [chatUuid, files]);
    const token = useUserStore.getState().token;
    const {openModal} = useLimitModalStore();

    const [messages, setMessagesa] = useState<WeMessages>([]);
    const {enabledMCPs} = useMCPTools()
    const baseChatUrl = `${API_BASE}`;

    const [mcpTools, setMcpTools] = useState<MCPTool[]>([])
    useEffect(() => {
        if (enabledMCPs && enabledMCPs.length > 0) {
            window.myAPI.mcp.listTools().then((allMCPTools) => {
                const filteredTools = allMCPTools.filter((tool) => {
                    return enabledMCPs.some((mcp) => mcp.name === tool.serverName);
                });
                setMcpTools(filteredTools)
            })
        } else {
            setMcpTools([])
        }
    }, [enabledMCPs])

    // modify useChat configuration
    const {
        messages: realMessages,
        input,
        handleInputChange,
        isLoading,
        setMessages,
        append,
        setInput,
        stop,
        reload,
    } = useChat({
        api: `${baseChatUrl}/api/chat`,
        headers: {
            ...(token && {Authorization: `Bearer ${token}`}),
        },
        body: {
            model: baseModal.value,
            mode: mode,
            otherConfig: {
                ...otherConfig,
                extra: {
                    ...otherConfig.extra,
                    isBackEnd: otherConfig.isBackEnd,
                    backendLanguage: otherConfig.backendLanguage
                },
            },
            // if the model supports function call and there are enabled MCP tools, add tools configuration
            ...(baseModal.functionCall && mcpTools.length > 0 && {
                tools: mcpTools.map(tool => ({
                    id: tool.id,
                    name: `${tool.serverName}.${tool.name}`,
                    description: tool.description || '',
                    parameters: tool.inputSchema
                }))
            })
        },
        id: chatUuid,
        onResponse: async (response) => {
            if (baseModal.from === "ollama") {
                const reader = response.body?.getReader();
                if (!reader) return;

                while (true) {
                    const {done, value} = await reader.read();
                    if (done) break;

                    const text = new TextDecoder().decode(value);
                    const lines = text.split("\n").filter((line) => line.trim());

                    for (const line of lines) {
                        try {
                            const data = JSON.parse(line);
                            if (data.message?.content) {
                                setMessages((messages) => {
                                    const lastMessage = messages[messages.length - 1];
                                    if (lastMessage && lastMessage.role === "assistant") {
                                        return [
                                            ...messages.slice(0, -1),
                                            {
                                                ...lastMessage,
                                                content: lastMessage.content + data.message.content,
                                            },
                                        ];
                                    }
                                    return [
                                        ...messages,
                                        {
                                            id: uuidv4(),
                                            role: "assistant",
                                            content: data.message.content,
                                        },
                                    ];
                                });
                            }
                        } catch (e) {
                            console.warn("Failed to parse Ollama response line:", e);
                        }
                    }
                }
            }
        },
        onFinish: async (message) => {
            if(message.parts){
                console.log(message.parts);
            }
            clearImages();
            scrollToBottom();
            try {
                const needParseMessages = [...messages, message].filter(
                    (m) => !refUuidMessages.current.includes(m.id)
                );

                refUuidMessages.current = [
                    ...refUuidMessages.current,
                    ...needParseMessages.map((m) => m.id),
                ];

                if (message) {
                    const {files: messagefiles} = parseMessage(message.content);
                    for (let key in messagefiles) {
                        await updateContent(key, messagefiles[key], false, true);
                    }
                }

                setIsFirstSend();
                setIsUpdateSend();

                let initMessage = [];
                initMessage = [
                    {
                        id: uuidv4(),
                        role: "user",
                        content: input,
                    },
                ];
                await db.insert(chatUuid, {
                    messages: [...messages, ...initMessage, message],
                    title:
                        [...initMessage, ...messages]
                            .find(
                                (m) => m.role === "user" && !m.content.includes("<boltArtifact")
                            )
                            ?.content?.slice(0, 50) || "New Chat",
                });
            } catch (error) {
                console.error("Failed to save chat history:", error);
            }
            setCheckCount(checkCount => checkCount + 1);
        },
        onError: (error: any) => {
            const msg = error?.errors?.[0]?.responseBody || String(error);
            console.log("error", error, msg);
            toast.error(msg)
            if (String(error).includes("Quota not enough")) {
                openModal('limit');
            }
            if (String(error).includes("Authentication required")) {
                openModal("login");
            }
            // add Ollama error handling
            if (baseModal.from === "ollama") {
                toast.error("Ollama server connection failed, please check configuration");
            }
        },
    });
    const {status, type, projectId} = useUrlData({append});
    const projectLoadedRef = useRef(false);
    
    // Effet pour charger les données du projet si un projectId est présent dans l'URL
    // Ne s'exécute qu'une seule fois au chargement initial de la page
    useEffect(() => {
      const loadProjectData = async () => {
        // Vérifier si le projet a déjà été chargé ou s'il n'y a pas d'ID de projet
        if (!projectId || projectLoadedRef.current) {
          return;
        }
        
        try {
          // Marquer le projet comme étant en cours de chargement
          projectLoadedRef.current = true;
          console.log("Chargement des données du projet avec ID:", projectId);
          
          const project = await getProjectById(projectId);
          if (project) {
            // Formater les données du projet pour le chat
            const webGenService = new WebGenService();
            const projectPrompt = webGenService.generateWebsitePrompt(project);
            
            // Envoyer le prompt formaté au chat
            append({
              id: uuidv4(),
              role: "user",
              content: projectPrompt
            });
            
            console.log("Project data loaded and sent to chat:", project.name);
          } else {
            console.warn("Project not found with ID:", projectId);
          }
        } catch (error) {
          console.error("Error loading project data:", error);
          toast.error("Erreur lors du chargement des données du projet");
          // Si une erreur se produit, réinitialiser le flag pour permettre un nouveau chargement
          projectLoadedRef.current = false;
        }
      };
      
      loadProjectData();
    }, []);
    
    // Nettoyage en cas de démontage du composant
    useEffect(() => {
      return () => {
        projectLoadedRef.current = false;
      };
    }, []);

    // listen to url when official website jumps in
    useEffect(() => {
        if (status && type === "sketch") {
            showGuide();
        }
    }, [status, type]);


    const parseTimeRef = useRef(0);

    useEffect(() => {
        const visibleFun = () => {
            if (isLoading) return;
            else if (!isLoading) {
                setTimeout(() => {
                    updateFileSystemNow();
                }, 600);
            }
        };
        document.addEventListener("visibilitychange", visibleFun);
        return () => {
            document.removeEventListener("visibilitychange", visibleFun);
        };
    }, [isLoading, files]);

    useEffect(() => {
        if (Date.now() - parseTimeRef.current > 200 && isLoading) {
            setMessagesa(realMessages as WeMessages);
            parseTimeRef.current = Date.now();

            const needParseMessages = messages.filter(
                (m) => !refUuidMessages.current.includes(m.id)
            );
            parseMessages(needParseMessages);
            scrollToBottom();
        }
        if (errors.length > 0 && isLoading) {
            clearErrors();
        }
        if (!isLoading) {
            setMessagesa(realMessages as WeMessages);
            createMpIcon(files);
        }
    }, [realMessages, isLoading]);

    const [userScrolling, setUserScrolling] = useState(false)
    const userScrollTimeoutRef = useRef<NodeJS.Timeout>()

    // handle user scrolling
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement
        const isScrolledToBottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 10

        if (!isScrolledToBottom) {
            // user is scrolling to view history messages
            setUserScrolling(true)
            
            // clear previous timer
            if (userScrollTimeoutRef.current) {
                clearTimeout(userScrollTimeoutRef.current)
            }
            
            // set new timer, allow auto scroll after 3 seconds
            userScrollTimeoutRef.current = setTimeout(() => {
                setUserScrolling(false)
            }, 3000)
        }
    }

    // modify scroll to bottom function
    const scrollToBottom = () => {
        if (userScrolling) return // if user is scrolling, do not execute auto scroll

        const messageContainer = document.querySelector('.message-container')
        if (messageContainer) {
            messageContainer.scrollTop = messageContainer.scrollHeight
        }
    }

    // clean up timer when component unmounts
    useEffect(() => {
        return () => {
            if (userScrollTimeoutRef.current) {
                clearTimeout(userScrollTimeoutRef.current)
            }
        }
    }, [])

    // add upload status tracking
    const [isUploading, setIsUploading] = useState(false);
    const filterMessages = messages.filter((e) => e.role !== "system");
    // modify upload handler
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length || isUploading) return;
        setIsUploading(true);

        const selectedFiles = Array.from(e.target.files);
        const MAX_FILE_SIZE = 5 * 1024 * 1024;

        const validFiles = selectedFiles.filter((file) => {
            if (file.size > MAX_FILE_SIZE) {
                toast.error(t("chat.errors.file_size_limit", {fileName: file.name}));
                return false;
            }
            return true;
        });

        try {
            const uploadResults = await Promise.all(
                validFiles.map(async (file) => {
                    const url = await uploadImage(file);
                    return {
                        id: uuidv4(),
                        file,
                        url,
                        localUrl: URL.createObjectURL(file),
                        status: "done" as const,
                    };
                })
            );

            addImages(uploadResults);
            if (uploadResults.length === 1) {
                toast.success(t("chat.success.images_uploaded"));
            } else {
                toast.success(
                    t("chat.success.images_uploaded_multiple", {
                        count: uploadResults.length,
                    })
                );
            }
        } catch (error) {
            console.error("Upload failed:", error);
            toast.error(t("chat.errors.upload_failed"));
        } finally {
            setIsUploading(false);
        }

        e.target.value = "";
    };

    // modify submit handler
    const handleSubmitWithFiles = async (
        _: React.KeyboardEvent,
        text?: string
    ) => {
        if (!text && !input.trim() && uploadedImages.length === 0) return;

        try {
            // process file references
            // const processedInput = await processFileReferences(input);
            // if it is ollama type model, need to use separate logic, not use cloud

            // save current images attachments
            const currentAttachments = uploadedImages.map((img) => ({
                id: img.id,
                name: img.id,
                type: img.file.type,
                localUrl: img.localUrl,
                contentType: img.file.type,
                url: img.url,
            }));
            console.log(JSON.stringify(uploadedImages), JSON.stringify(currentAttachments), 'currentAttachments')
            // clear images state
            clearImages();

            append(
                {
                    role: "user",
                    content: text || input,
                },
                {
                    experimental_attachments: currentAttachments,
                }
            );
            setInput("");
            setTimeout(() => {
                scrollToBottom();
            }, 100);
        } catch (error) {
            console.error("Upload failed:", error);
            toast.error("Failed to upload files");
        }
    };

    // modify keyboard submit handler
    const handleKeySubmit = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmitWithFiles(e);
        }
    };

    // modify paste handler
    const handlePaste = async (e: ClipboardEvent) => {
        if (isUploading) return;

        const items = e.clipboardData?.items;
        if (!items) return;

        const hasImages = Array.from(items).some(
            (item) => item.type.indexOf("image") !== -1
        );
        if (hasImages) {
            e.preventDefault();
            setIsUploading(true);

            const imageItems = Array.from(items).filter(
                (item) => item.type.indexOf("image") !== -1
            );

            try {
                const uploadResults = await Promise.all(
                    imageItems.map(async (item) => {
                        const file = item.getAsFile();
                        if (!file) throw new Error("Failed to get file from clipboard");

                        const url = await uploadImage(file);
                        return {
                            id: uuidv4(),
                            file,
                            url,
                            localUrl: URL.createObjectURL(file),
                            status: "done" as const,
                        };
                    })
                );

                addImages(uploadResults);

                if (uploadResults.length === 1) {
                    toast.success(t("chat.success.image_pasted"));
                } else {
                    toast.success(
                        t("chat.success.images_pasted_multiple", {
                            count: uploadResults.length,
                        })
                    );
                }
            } catch (error) {
                console.error("Failed to upload pasted images:", error);
                toast.error(t("chat.errors.paste_failed"));
            } finally {
                setIsUploading(false);
            }
        }
    };

    // add paste event listener
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.addEventListener("paste", handlePaste);
        return () => {
            textarea.removeEventListener("paste", handlePaste);
        };
    }, []);

    // add drag over handler
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isUploading) return;
        setIsUploading(true);

        try {
            const items = Array.from(e.dataTransfer.items);
            const imageItems = items.filter((item) => item.type.startsWith("image/"));

            const uploadResults = await Promise.all(
                imageItems.map(async (item) => {
                    const file = item.getAsFile();
                    if (!file) throw new Error("Failed to get file from drop");

                    const url = await uploadImage(file);
                    return {
                        id: uuidv4(),
                        file,
                        url,
                        localUrl: URL.createObjectURL(file),
                        status: "done" as const,
                    };
                })
            );

            addImages(uploadResults);

            if (uploadResults.length === 1) {
                toast.success("Image added to input box");
            } else {
                toast.success(`${uploadResults.length} images added to input box`);
            }
        } catch (error) {
            console.error("Failed to process dropped images:", error);
            toast.error("添加图片失败");
        } finally {
            setIsUploading(false);
        }
    };

    const showJsx = useMemo(() => {
        return (
            <div
                className="flex-1 overflow-y-auto px-1 py-2 message-container [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                onScroll={handleScroll}  // add scroll event listener
            >
                        <Tips
            append={append}
            setInput={setInput}
            handleFileSelect={handleFileSelect}
          />
                <div className="max-w-[640px] w-full mx-auto space-y-3">
                    {filterMessages.map((message, index) => (
                        <MessageItem
                            handleRetry={() => {
                                // test
                                reload();
                            }} 
                            key={`${message.id}-${index}`}
                            message={message}
                            isEndMessage={
                                filterMessages[filterMessages.length - 1].id === message.id
                            }
                            isLoading={isLoading}
                            onUpdateMessage={(messageId, content) => {
                                append( {
                                    role: "user",
                                    content: ` ${content?.[0]?.text}`,
                                })
         
                            }}
                        />
                    ))}

                    {isLoading && (
                        <div className="group" key="loading-indicator">
                            <div
                                className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.02] transition-colors">
                                <div
                                    className="w-6 h-6 rounded-md bg-[rgba(45,45,45)] text-gray-400 flex items-center justify-center text-xs border border-gray-700/50">
                                    <svg
                                        className="w-4 h-4 animate-spin"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="3"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-4 rounded bg-gray-700/50 animate-pulse"/>
                                        <div className="w-32 h-4 rounded bg-gray-700/50 animate-pulse"/>
                                        <div className="w-16 h-4 rounded bg-gray-700/50 animate-pulse"/>
                                    </div>
                                    <div className="mt-2 space-y-2">
                                        <div className="w-full h-3 rounded bg-gray-700/50 animate-pulse"/>
                                        <div className="w-4/5 h-3 rounded bg-gray-700/50 animate-pulse"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} className="h-px"/>
                </div>
            </div>
        );
    }, [messages, isLoading, setInput, handleFileSelect]);

    // show guide modal
    const showGuide = () => setVisible(true);

    // handle file selected
    const handleFileSelected = () => {
        console.log('handleFileSelected')
        // handle upload logic
        setVisible(false);
    };

    return (
        <div
            className="flex h-full flex-col dark:bg-[#18181a] max-w-full"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {showJsx}
            <ChatInput
                input={input}
                setMessages={setMessages}
                append={append}
                messages={messages}
                stopRuning={stop}
                setInput={setInput}
                isLoading={isLoading}
                isUploading={isUploading}
                uploadedImages={uploadedImages}
                baseModal={baseModal}
                handleInputChange={handleInputChange}
                handleKeySubmit={handleKeySubmit}
                handleSubmitWithFiles={handleSubmitWithFiles}
                handleFileSelect={handleFileSelect}
                removeImage={removeImage}
                addImages={addImages}
                setIsUploading={setIsUploading}
                setBaseModal={setBaseModal}
            />
        </div>
    );
};
