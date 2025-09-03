'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import API_URL from '@/config'

import { UserOptions as AutoTableUserOptions } from 'jspdf-autotable'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

interface AutoTableOptions extends Omit<AutoTableUserOptions, 'theme'> {
    startY: number;
    head: string[][];
    body: string[][];
    theme?: 'striped' | 'grid' | 'plain' | 'css';
}

declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: AutoTableOptions) => jsPDF;
        lastAutoTable?: {
            finalY: number;
        };
    }
}

interface CompanyData {
    id?: number;
    gstin?: string;
    legal_name?: string;
    registration_date?: string;
    trade_name?: string;
    last_update?: string;
    company_type?: string;
    state?: string;
    delayed_filling?: string;
    Delay_days?: string;
    return_status?: string;
    address?: string;
    result?: string;
    year?: string;
    month?: string;
    return_type?: string;
    date_of_filing?: string;
    annual_turnover?: number;
    fetch_date?: string;
}

export default function AdminDashboard() {
    const [allData, setAllData] = useState<CompanyData[]>([])
    const [displayData, setDisplayData] = useState<CompanyData[]>([])
    const [editingId, setEditingId] = useState<number | null>(null)
    const [newAnnualTurnover, setNewAnnualTurnover] = useState<string>('')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(5)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)
    const router = useRouter()
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState({
        legal_name: '',
        gstin: '',
        state: '',
        status: 'all',
    })
    const [searchQuery, setSearchQuery] = useState('')
    const [sortConfig, setSortConfig] = useState<{ key: keyof CompanyData; direction: 'ascending' | 'descending' } | null>(null)

    useEffect(() => {
        const token = localStorage.getItem('auth_tokens')
        const userRole = localStorage.getItem('user_role')

        if (!token) {
            router.push('/')
        } else if (userRole !== 'admin') {
            router.push('/')
        } else {
            setIsAuthenticated(true)
            setIsAdmin(true)
            fetchData()
        }
    }, [router])

    useEffect(() => {
        let filteredData = allData.filter(item =>
            (filters.legal_name === '' || item.legal_name?.toLowerCase().includes(filters.legal_name.toLowerCase())) &&
            (filters.gstin === '' || item.gstin?.toLowerCase().includes(filters.gstin.toLowerCase())) &&
            (filters.state === '' || item.state?.toLowerCase().includes(filters.state.toLowerCase())) &&
            (filters.status === 'all' || item.result === filters.status)
        )

        if (searchQuery) {
            filteredData = filteredData.filter(item =>
                item.gstin?.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        const uniqueData = Array.from(new Map(filteredData.map((item: CompanyData) => [item.gstin, item])).values())
        const sortedData = sortData(uniqueData)

        setDisplayData(sortedData)
        setCurrentPage(1)
    }, [filters, searchQuery, allData, sortConfig])

    const fetchData = async () => {
        try {
            const response = await fetch(`${API_URL}/companies/`)
            if (response.ok) {
                const data = await response.json()
                if (Array.isArray(data)) {
                    setAllData(data)
                    setDisplayData(data)
                } else {
                    console.error("Fetched data is not an array:", data)
                    setAllData([])
                }
            } else {
                console.error("Failed to fetch data")
            }
        } catch (error) {
            console.error("Error fetching data:", error)
        }
    }

    const validateGST = (gstin: string) => {
        // Example GST validation regex for India (15 alphanumeric characters starting with digits, ending with a letter)
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}$/i;
        return gstRegex.test(gstin);
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(""); // Clear any previous errors

        if (!searchQuery) {
            setError("GST Number is required.");
            return;
        }

        if (!validateGST(searchQuery.trim())) {
            setError("Invalid GSTIN. Please enter a valid GSTIN.");
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/fetch_and_save_gst_record/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ gstin: searchQuery }),
            });

            if (response.ok) {
                console.log("Record updated successfully");
                setTimeout(() => fetchData(), 1000);
            } else {
                console.error("Failed to updating record");
            }
        } catch (error) {
            console.error("Error fetching company details:", error);
        } finally {
            setIsLoading(false);
            setSearchQuery("");
        }
    };


    // const handleStatusChange = (value: string) => {
    //     setNewStatus(value)
    // }

    const handleAnnualTurnoverChange = (value: string) => {
        setNewAnnualTurnover(value)
    }

    const handleSaveChanges = async () => {
        if (editingId !== null) {
            const selectedItem = allData.find(item => item.id === editingId);
            if (!selectedItem) {
                console.error("Selected item not found");
                return;
            }

            const bodyData = {
                id: editingId,
                gstin: selectedItem.gstin,
                // status: newStatus || selectedItem.result,
                annual_turnover: newAnnualTurnover ? parseFloat(newAnnualTurnover) : selectedItem.annual_turnover,
            };

            try {
                setIsLoading(true);
                const response = await fetch(`${API_URL}/update_annual_turnover/`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(bodyData),
                });

                if (response.ok) {
                    console.log("Record updated successfully");
                    await fetchData();
                } else {
                    console.error("Failed to updating record");
                }
            } catch (error) {
                console.error("Error updating record:", error);
            }
            setIsLoading(false);
            setEditingId(null);
            setNewAnnualTurnover('');
        }
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    const filterDataForPDF = async (gstin: string): Promise<CompanyData | null> => {
        try {
            const response = await fetch(`${API_URL}/companies/${gstin}/`)
            if (response.ok) {
                const data = await response.json()
                return data || null
            } else {
                console.error("Failed to fetch company data")
                return null
            }
        } catch (error) {
            console.error("Error fetching company data:", error)
            return null
        }
    }

    const getMonthName = (monthNumber: string): string => {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const monthIndex = parseInt(monthNumber, 10) - 1;
        return months[monthIndex] || 'N/A';
    };

    const generatePDF = async (gstin: string) => {
        setIsLoading(true);
        try {
            // Fetch the filtered data
            const items = await filterDataForPDF(gstin);
            console.log("items:", items);

            // Check if there are any records
            if (!Array.isArray(items) || items.length === 0) {
                console.error("No data found for the provided GSTIN or array is empty");
                setIsLoading(false);
                return;
            }

            // Initialize jsPDF
            const doc = new jsPDF();

            

                        
            // const logoBase64 = "data:image/png;base64,...."; 
            const logoBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAOmBQADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9Dv2c/wDk3z4Yf9ibov8A6Qw16LXnX7Of/Jvnww/7E3Rf/SGGvRaACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDzr9nP/AJN8+GH/AGJui/8ApDDXotedfs5/8m+fDD/sTdF/9IYa9FoAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPOv2c/+TfPhh/2Jui/+kMNei151+zn/AMm+fDD/ALE3Rf8A0hhr0WgAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA86/Zz/5N8+GH/Ym6L/6Qw16LXnX7Of/ACb58MP+xN0X/wBIYa9FoAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPOv2c/wDk3z4Yf9ibov8A6Qw16LXnX7Of/Jvnww/7E3Rf/SGGvRaACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDzr9nP/AJN8+GH/AGJui/8ApDDXotedfs5/8m+fDD/sTdF/9IYa9FoAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPOv2c/+TfPhh/2Jui/+kMNei151+zn/AMm+fDD/ALE3Rf8A0hhr0WgAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA86/Zz/5N8+GH/Ym6L/6Qw16LXnX7Of/ACb58MP+xN0X/wBIYa9FoAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAopKTdQA6ikzS0AFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAedfs5/wDJvnww/wCxN0X/ANIYa9Frzr9nP/k3z4Yf9ibov/pDDXotABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUU1utADqrXl1b2NvJd3UyRQwqXeR2AVQOpJNS5GDz0r5x+OXxN/t66bwhok2dPtJA1xPHJxcSAfcGDgopPfqy+wNfPcS8Q4fhzAvFVtZbRj3f+Xc78uy+pmVdUae3V9ke+eG/EWi+KNPXVtDvlurZyVDgFSCOoKsAQfYitavjfwD4+1bwDqwvrEmW1lwt1as2EmXt9GHOG7ZPrivrTw/r2n+I9Htda0yUvbXcYkTd94eoPoQcg/SvL4P4yocT0XGS5a0fij5d15fkdOb5RUyup3g9n/malFJS19qeOFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB51+zn/yb58MP+xN0X/0hhr0WvOv2c/+TfPhh/2Jui/+kMNei0AFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABTGbaehp9cj8SvHFr4F8Ozak2x7uRTHaQsfvyEcEjIJUdTj9K5cbjKOX4eWKxErQirtmlGlOvNU6au2cV8cPid/YNq/hTQ7hDf3cZF1Ij/NbRkdBjo7An3A57ivnPHfv/n/AVY1C/vNUvptQ1C4ae5uJDJLI2Msx6njioK/lPijiOvxJjpYippBaRj2X+b6n6plWWwy2gqcd+r7v/IQ13Xwq+JN14F1hYLq4dtGu2/0qLbu2tjiRRng8DPqBjk4rhjSV5WWZliMoxUMZhZWlF/f5PyOrFYanjKTo1FdM+5rLULXULWG9sp0ngnQSRyRtlWU8ggjtVgNmvm/4H/FD+w7hPCOvXKrp0xP2SV+kEpOdpPZWJP0Psc19Gxtmv6p4Z4hw/EeBjiqWktpR7P8Ay7H5ZmOX1MurOlPbo+6JKKKK+iOAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPOv2c/+TfPhh/2Jui/+kMNei151+zn/AMm+fDD/ALE3Rf8A0hhr0WgAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigApDRSMeCKAK19e22m2ct9e3CQQQKZJZHbAVR3NfInxG8bXHjvxJLqzK6WsY8mzicAMkQORnHck5PXrjJxXpH7QHxCkMh8D6TcFQu19QdSQTlcrF6FcEE/gOxz4eK/n/xN4p+vV/7Jwsv3cH73nLt6L8z73hnK/ZQ+uVV7z+HyXf5hRRRX5IfXBRRRQAlfSvwP+JjeJrH/AIRvWrqSTVbOPckshybiIYAJPUuOhzyevrj5rq1pepXmi6la6tp03lXNpKssT9gwPf1HYjuCRX0/CnEdbhvHKvHWm7Ka7r/Nbo8rNstjmVDkfxLZn3AT0p6/dFc34E8XWfjTw3a61auPMddlxH3ilHDKRk49RnnBFdIv3RX9WYTFUsbRjiKLvGSTT8j8sqU5UpuE1ZoWiiiuggKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA86/Zz/AOTfPhh/2Jui/wDpDDXotedfs5/8m+fDD/sTdF/9IYa9FoAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAaetcn8R/G0Hgfwzcaoy7rl8Q2secb5G/A4AGW59MdSK6mRtucnAr5P+L/AI6bxp4oZbdl/s/TS9vbbTnfyd0mcd8D2AA+p+N424ijw9lspwf72fux9er+X5nr5LlzzHFKL+Fav/I4m4nmup5bq4kMkszmR2PUseSfxOTTBRRX8sSlKcnKTu2fqcYqK5Y7BRRRUjCiiigAooooA7j4SePm8D+I1F1IRpl+VhuxnhOfll6H7uTwOxNfWMMySRrJGwZWAKsOhBr4WxX0X+z/AOOm1jSX8I38rveaYvmQtI24vAT0GefkJA+hUDpX7P4X8UOnU/sbES0esL9+sfnuj4vijLLr67TWv2v8z2OimqadX7oj4gKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA86/Zz/AOTfPhh/2Jui/wDpDDXotedfs5/8m+fDD/sTdF/9IYa9FoAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigApu5aU9Kr3VxDawPdXEixxRKXkdjgKoGST7cVMpKC5nsFrnnXx08bSeGfDK6fp900N/qjGKNoyQyRrjewI+6eQPX5uOmR8vV0fxA8X3HjXxNdazI0gt93lWscmMxwg/KOOATyTz1J5Nc5X8rcbcQviDNJ1IP93H3Y+nf5vX0P1HJMvWAwqUvjlqxaKKK+PPaCiiigAooooAKKKKACtHw3rt14Z12z12zZvMs5RJtDbd6/xKTg8EEjp3rOpK2w9ephqsa1J2lFpp+hFSEasXCWqejPtvw9rlh4i0m11rTZC9tdRh1LKQw7EEHoQQR+FaeRXgH7OnjMw3Fz4LvpBskzcWZJP3v+WiemCMMOnIbrnj3xW3V/WnDGdxz/LKeMXxbSXaS3/z9D8lzLBPL8TKhL5eg8HNLSClr6E4QooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPOv2c/wDk3z4Yf9ibov8A6Qw16LXnX7Of/Jvnww/7E3Rf/SGGvRaACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKTNGaAFopMijIoAWiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiikzQAMcLXkv7QHjJtH8Np4cs2Iu9Wz5hxnZbj734k4HTpu6HFerzSRxxNI8iqqjcSTgACvj/wCJ3jCTxp4tutSV2+xwn7PaLuyBGvG76sct+IGTivgPEbPP7IymVGm7VKvur0+0/u0+Z73DuB+uYtSkvdjq/wBPxOUHPNLiiiv5jP0zcKKKKBhRRRQAUUUUAFFFFABRiiigC3pGq3mh6pa6vp8nl3FpKssbe4PQ47HoR3BNfZnhnXLXxJoNlrliwMV3EJMBs7T/ABLn1ByPwr4oNe7fs3+KmaK+8HXMhJQm8tR83CnAdeSQADtOBjlm7mv1Pwtzx4LMJZbUfuVdv8S/zX6HyvFOB9th1iIrWP5P/I93U5FLTV+6KdX9EH58FFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRSUALRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAHnX7Of/Jvnww/7E3Rf/SGGvRa86/Zz/5N8+GH/Ym6L/6Qw16LQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFJS0lADNwpcivMvj1rl7ofg6F9N1S5sbqW8RVaCVo3YBWLDKkHHSvn3/hOvG//Q465/4MJv8A4qvz/iTxAwvDmO+pVaTk7J3TXU93LshrZjR9tCSSv5n2duX1o3D86+OLH4jePdPuBdW/i/VWcAjE1y0yc/7DkqfyrZtfjh8SrWbzX15bkYxsmto9v1+VQf1ryaHi3lU9KtKa+5/qvyOufCmMXwyi/v8A8j6vU89c0+vmrT/2kPGFqAL7S9Nu/myzbWjO30GDj8a6/R/2mPD9xhdb0G9snaQKpgdZ12H+JidpGPQA/wBK9/B+InD+MfL7bkf95NfjscNbh/MKOrhf0sz2aiuO0b4teAdc2ra+I7WOR84juCYW9P48fh611qy7iMc57ivrMJj8Ljo8+FqRmvJpnlVKNSi+WpFp+ZJRTd1G6usyHUU3Jp1ABRRRQAUUUUAFFFFABRRRQAUUUUAFRtjmpKjb733qAPPvjT4wk8KeDpo7VsXupE2kJ5+QEfOwI6EL09yOuMV8q16T8ePFDa940fTIdwttHT7OoPeU8u3TI6quOR8uR1rzfFfy/wCIedf2tnM6cXeFL3V6rd/N/kfpnDuC+qYNSa96er/QKKKK+EPfCiiigAooooAKKKKACiiigAooooAK2PB/iK58K+JLDXLWQp5Ew8z0aM8Op4PBUntx1HOKx6TbW+GxFTCV4V6TtKLTXqjOrTjWg6ctmrH3VayxzW8c0bbkkUMp9Qalrzf4F+J5te8CW9rcyB7jS3Nmx7lBzHwAMYUhe/3c969G3dBX9iZTj4ZpgaWMp7Timfj+JoSw1aVGW6dh1FFFegYBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRTS2KG7AOopm4+lMabbkswUAZOegpNqKuwJqazAVw2vfGjwDoKurayl7Kn/ACzsx5pJxkAMDt5z3NeZa5+0pq1xJLH4f0G3toSSsctyxkc88MVGFBx/Dlvqa+VzTjXJMp92tXTl2j7z/A9TC5NjsXrTpu3d6H0HuB49acnevk21+LfjS+8SaXf6z4ivTaW97HJLb2zCJWi3qXQquA4wMAMT+pr6xhOVDetXw1xVheJ41ZYWLioNLW13db7snMsrrZY4xqtO/Ykooor6g80KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDzr9nP/AJN8+GH/AGJui/8ApDDXotedfs5/8m+fDD/sTdF/9IYa9FoAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDxf9pnaPDujrkZ+2tx/wBszXzyK9w/aex9o8O4P8N1/OKvD6/l7xHq+04irabKK+6KP03htWy6Hq/zCiiivhT3gooooEJ/StjQfGHibww+7Q9aurRSdzRq+Y2PGcqeM8DnGcCsiiujD4qthJKpQm4tdU7MipRp1o8tRXXmex+Gv2kdctMQeKNKhv0yAJrf91KOucqcq3UAY29O+a9b8K/Ezwj4y3R6RqirOg3Nb3H7uTHPIB+8OO2cZGcZr5BoywYMpwR3r7/JvEzN8uajin7aHnv8pL9bnz+N4ZweJu6XuS8tvuPutT05p2a+UvBvxr8XeFStrdTf2rYgj9zcsS6DGPkfqO3ByOOOte6+C/iz4Q8YKkMF8LO/bCtZ3J2uWP8AdPRxkHpz0yBmv2HIOOspz21OM+Sp/LLT7nsz5DH5Ji8B7043j3X69juKWo9y+tLn2r7M8cfRRRQAUUUUAFFFFABRRRQAVieLtfh8L+H9Q164UOtnC0ixliPMfHypkA43NgZxxmtuvE/2lPES2+laf4YhceZeSm5mAIyI04XIxnljkH/YIrwuJc0/sbKq2M6xjp6vRHbl2FeNxUKPd6+nU8AuLia6uJLm4kMksrGR2bqWJJJ/Mn86ZSUtfyHOTnJyfU/XUrJJBRRRUjCiiigAooooAKKKKACiiigAooooAKKKKAPWP2d/Ebaf4quPD0zfuNVhLRjk4mj5HfABXfk45wor6TUc18UeF9Z/4R7xFp2tmMutncJKygZJUHnjIycE4564r7WVlbDA9a/ojwpzN4rK54OT1pS/CWq/G5+d8VYb2WLVVfaX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KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPOv2c/+TfPhh/2Jui/+kMNei151+zn/AMm+fDD/ALE3Rf8A0hhr0WgAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPlD47f8lM1P/cg/wDRS1wA7133x0/5KZqfX7kH/opa4Gv5E4q/5HeK/wAcj9Zyj/caX+FBRRRXz56QUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAB/AV9XfAxf+LX6N9bj/ANKJK+Ufzr7I+HPHgHw9/wBg23/9Fiv1jwkp82ZV59ofm0fJ8XS/2anHvL9DpNwFea/tBag1v8OpreNQReXUELE9QA2/I98oB+NekmvDf2mb6MWuiab5Z3vJLNu7YVVGP/HhX6zxtivqmQYmpezcbL56HyeTUvbY+lHzv92p4NRRRX8nH6wFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAhruvhP8N7jx5rJe682LSrMhriZVxvbtGrHjJ4J9AB6iuf8I+FdS8Za9BoemRsWkO6WTbkQxgjc59hn8SQOpFfXnhfwzpnhHR7fQ9IR1ggHV2yzserMfUn0wK/R/D/hF55iVjMUv3EH/wCBPovl1Pm+IM2WCp+wpv35fgv62NWNGWnZxTqy/EXiDS/DOlz6zrFysNtbrlierHsoHcntX9H1atPD03UqO0YrVvoj86jGU5KMdWxfEPiLSfDOkz6vrF0tvbQryx6k9lA7k9hXyt8Qvibrnjy7eOWRrfS0k3W9mpGBjOGf1bn3A7VF8RviLqnj/VjPMzwafAx+y2u7hB/eb1Y/pnArkq/nXjjjqpndR4LAycaC37z9f7vZfefoeR5FHBxVfEK8/wAv+CJzS4oor8zPpWrhRRRQMKKKKACiiigAooooAKKKKACiiigAooooAK7n4I/8lQ0X63H/AKTyVw1dz8Ef+SoaL9bj/wBJ5K93hn/kcYb/ABx/M8/Nf9yq/wCFn1n6U6m+lOr+vUfkgUUUUwCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDzr9nP/k3z4Yf9ibov/pDDXotedfs5/8AJvnww/7E3Rf/AEhhr0WgAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPmP8AaOghg8fW7wxqjT6bFJIQPvt5ki5PqcKo+gFeWivW/wBpa1uF8YadfNERBLpqxI/ZmSSQsPwDr+deSCv5P43hycQYpWt736H6rkb5svpen6hRRRXyh6wUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFfbfh2CG38P6dbwRrHHHaxKqqMAAKMAV8TRxtNKkMfLOwVfck4FfcGkwSWul2lvMuJIoERhnOCFANftPg/D95ip26R/U+K4velJev6Fk+tfNH7RmofafG1tYrdeYlnYoGjDcRyM7seOxK7D9MV9Lc818lfGW8jvviRrE0KuAkiQncOrJGqnH5fyr6bxUxHscjVNfbml8ld/mkebwtT58dzfyxb/JfqcVRRRX84H6OFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABToYZrmZLe3jaSWVgiIoyWY8AAd+aYxwM+le4/AP4bLMw8ba5ZgojY06OROpH/AC2/ov0J9K93h3I6/EOPhg6Oz+J9o9X/AJeZwZjjoZfh3Wn8l3Z3/wAKfh3D4F0X/SFik1S7w9zMq4IB5EYJ5wPwya7w+1IOAKivLu1s7WW6up44YYUMkkjsAqqBkkk8AAV/V2AwOHynCxw1BcsIL+m/1PyqvWqYqo6lR3kyDWtYs9B0u51jUpvKtrWMySN7D0HcnoB718nfET4iap8QNUFxcboLCAkWtqG4Qf3m7Fj69ulanxc+Jlx401V9O065caLat+5UKV85scyMM88k49Bg9c158tfgnH/Gss3rPL8DK1GO7/nf+S/E+7yDJVhYrE11772Xb/ghRRRX5efUhRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFd18EI5JPido7RqSIxcMxAJ2jyJBk+nJA59a4WvVP2cf+R8uf+wZL/wCjIq+j4Rp+2zzCwf8AOjzM4ly4Cq/7rPpZS3epKaD2NOr+uD8nCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA86/Zz/wCTfPhh/wBibov/AKQw16LXnX7Of/Jvnww/7E3Rf/SGGvRaACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA8B/aeDef4ebBxtuuf+/VeHivof8AaXjY+HNKkVW2rencR0HyGvngV/L/AIkUnS4hreai/wDyVH6Zw3Lmy+Hk3+YUUUV8Ie+FFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAFjTf+Qlaf9d4/wD0IV9yL90V8Oab/wAhK0/67x/+hCvuNfu1+5eD/wDCxfrD/wBuPhuMPjo+j/QTH618Y+O73+0PGmt3fl7C99MNu7PRiP6V9muxVS3oK+HtUvv7S1W81ERmMXVxJPtPJXcxbH4ZrXxfrWw2Go33lJ/ckTwhC9WpLyS/H/gFaiiivwg+7CiiigAooooAKKKKACiiigAooooAKKKKACiinQwTXM8drBG0kszBEReSzE4AH1yPzpxi5tRjuxNpb7HTfDfwTcePPEkWlrI0VrEPOu5UI3JEP7ue5zgdcZzg4xX11Y2drp1pFY2UCQwQKI440GFUDgACuV+FfgqPwT4Xgs5oduoXQE9824MRKQMrkEjC9ODjgnvXZV/UPAnDEeH8vUqq/fVNZeXZfLr5n5fnmZyzHEPl+COi/wAxC+K+ffjp8UP7Qml8FaDcRvZp/wAf0yc+ZIG/1Y7YUgE46njjBz23xr+Ix8I6T/Y+k3G3Vr9TsdSM28fGWPcE5IX6E9q+YcV8n4k8X/V4vJ8DL3n8bXRfy+r6nrcNZQqr+uVlotl+oUtFFfhR90FFFFIYUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABXsH7NVlFN4n1S+ZmElvZCNR2w7gn/ANAH614/Xuf7MtiN2uakHO79zBt7Y+Y5r7Pw/pe24hw/Wzb+5Nni8QT5MvqfL80e8U+mqMqKdX9UH5cFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB51+zn/AMm+fDD/ALE3Rf8A0hhr0WvOv2c/+TfPhh/2Jui/+kMNei0AFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB5h+0DZ3F18PJpo4wVtbqGWQnjCk7f5sK+YK+v/ixpv9q/DrXrbzjF5dqbjIXP+qIlx+OzH418gV/O/izh3TzanV6SgvvTa/Kx+g8J1ObCSh2l+iCiiivyw+qCiiigAooooAKKKKACiiigAooooAKKKKACiiigC5otvNdazYWtvGzyzXUUaKvVmLgAfnX28n3a+L/BM0dv4y0GeaRUjj1O2Z2Y4CgSqSST0r7QjxX7x4QU4rC4mfVyj+TPg+LpN1qcfJiS8Rt9K+FR/SvtDx1LLb+CfEE8EjRyR6ZdMjqcFWETEEEcgivi+vO8X6v77C0vKT/FHRwhB8tWXp+otFFFfjB9oFFFFABRRRQAUUUUAFFFFABRRRQAUUUGmAV6/wDs/wDgRdW1STxhqMZNrp7bLUZ+/Pxljg5wo7HruHTGK8v0HRrzxDrVnolirNNeTLEuFJ2gn5mOOwGST2AJPFfZHh/QbDw3o9roumwiO3tU2qB3J5J57kkn8a/TfDThtZpjf7QxCvTpPTzl0+7f7j5fiXMvq1H6vTfvT/Bf8E1MVi+LPE2n+EdDuNb1KULHAp2JuAaV8Hai56k/4ntWw5whY4r5g+N/j6TxP4gfRLGUf2bpchUFJMieXGGc4446Dr3PfA/YuL+IocOZdKun+8lpBefd+S3PkMpy+WY4hU/srVvyOF8Q67qHibWrrXNUk8y4u33McAAADCqMdgAB+FZ9FFfypWrVMRUlWqO8pO79WfqkKcaUVTgrJbBRRRWRYUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAhr6P/ZotYV8I6leLGPNl1Fo2b1CxoQPw3N+dfOH8xX1v8FbOax+GuiwzbdzxyTDacja8jOv47WFfpvhTh/bZ3Kr/JBv72kfMcVVOXBqPd/8E7iiiiv6OPzsKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDzr9nP/k3z4Yf9ibov/pDDXotedfs5/wDJvnww/wCxN0X/ANIYa9FoAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigCjq1pHfaXeWMsKypcQvE0bDIYMpBBz2Oa+IpoZLeaS3mXbJExRhx1B56V9zt0I7V8aePtL/sXxprOm+U8axXkhRWOTsY7lP4qwNfjHi/hHKhhsUls3F/NJ/ofY8I1bVKlLuk/u/4cwKKKK/Cz7oKKKKACiiigAooooAKKKKACiiigAooooAKKKKALGm/8hK0/67p/6EK+4lTGOa+HdN/5CVp/13j/APQhX3IvQV+5eD/8LF+sP/bj4bjD46Po/wBDA8ff8iL4i/7BN3/6JavjKvs3x/8A8iL4i/7BN3/6JavjKvO8X/8AfML/AIZfmjp4R/hVfVfkFFFFfjx9gFFFFABRRRQAUUUUAFFFFABRRRQAUGitfwn4duvFniGy0Gz3BrmQB5Au7ykHLORkdBk9eenetsPh6mLrRoUleUmkl5szq1I0oOpPRLc9o/Z38Fm10+fxjqFuBLdkw2e5QSIhwzjuNxyO3C56EV7X/DVXStNtNI02202yiEcFtGsUagYwoGBUt1dQWNrNeXUgjhgjaSRv7qqMk/kK/rnIMqo5BltPCR+yryfnu2fkmOxc8diJVpddvToee/Gzx03hXwu1jp155WpaifKiMbDfHH/E/qOBgEdzxgjNfLeK6f4jeLW8aeLrzWFZvswbybUMTkQqSF4I+XPLEere2a5mv5x424hln+aSnB/u4e7H0XX5n6LkeXLL8KlJe9LV/wCXyCiiivjj2gooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAFVmYKoySQAPWvtfwnYrpnhrTNPjhMQt7SKPyzn5SFGRzz1r5B8GaR/b3izSNI8t5EubyJZQhwfL3Auc9sKGP4V9ow8Dbtxiv3Dwgwdo4n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hXrf7SGprc+LLLTVLYs7Pcw3fLudj29cAfpXkor8L8RMf9ez+sr3VO0V8t/xPuOHaHscvi+r1/r7gooor4c90KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACn29vNeXEdnbRPLNO4jjjUZLsTgADuSSOKZXpvwC8Jtrni4a5NGTa6OPMO7GDMwIQYPPHzN7EDkcZ9XJMsqZzmFLBU/ttJ+S6v5I5Mdio4LDyry6L8eh9A+BvDieF/Cum6GNu+2hAl2jgyE7nPU9WJP41v02P7tPr+v8Lh6eEoxoUlaMUkvkfkVSpKrJzlu9QooorcgKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA86/Zz/5N8+GH/Ym6L/6Qw16LXnX7Of/ACb58MP+xN0X/wBIYa9FoAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKZjr1p9FAHlXx58Ft4g8L/ANt2cJN5o+ZMBQTJCfvr68cN+B4ya+Zea+6rqKOeB4Zo1kjkBV1ZchgeoIPUV8e/Ejwi3gvxZd6Sob7K7efaMwxuiboOvO05UnvjtnFfhPitkHsasM3orSXuz9ej+7Q+44Vx/NGWDn01X6nMUUUV+NH2YUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB9F/s36wt34XvtFLL5mn3Yk2hSMJIMgk9D8yv09K9fbp9a+Zf2eda/s7x02myTFYtStmi2mXapdfmU7ejNgMB3wTX00fTiv6i8O8w+v5BSUnrC8X8tvwsfl3EOH+r4+faWv3/wDBPjn4laS2h+PNb0/bEoF20yLFwqpJiRRjAxhWAI9Qe1c3XsP7SeitbeINN1xSSt5bmEjjgxtnp16OK8eFfz9xXgP7NznEYfZKTa9HqvzPv8or/WcFTqeVn6rQKKKK+ePSCiiigAooooAKSlrc8C2P9peMtFs/N8vzL2I7tuejA9PwrpwdB4rEU6EftNL73Yyr1PZU5VH0Vz648G6S3h/wvpejSLEslnZxRS+V9wyBRvYcAnLZOSOc1sbl9aYoG3FU9avF07Sb2+aZI/s9u8u9iAF2qTk59K/siEYYLDKPSEfwSPxxt1Z36tnyN8StYXxB471rU49hRroxRlOVZIwI1bn1Cg/jXNinyyvPK80mC0jFmx6k5plfx1mGKljcXVxM95yb+9n7Dh6SoUY049EkFFFFcZuFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAhyRySyLFFGzu5Cqqrkk5wAB35r69+GPhMeDfCNppUkYF04+0XX3f9cwGRkdccLnJ6V4X8CPBbeJPFA1q6iBsdIxLlkyrz/wKM+nLHrjA6ZFfTyjGK/ePCrIPY0Z5tWWs/dj6dX9+h8JxVj/aVFhIPRav1HrTqQUtfsZ8gFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAHnX7Of/Jvnww/7E3Rf/SGGvRa86/Zz/wCTfPhh/wBibov/AKQw16LQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUANbkV5z8avAw8V+GWvLCxM2qaefOh8sDfInO6P1ORkgDuBj0PozVGy/WvPzTLqObYOpg8Qrxmrenmb4bETwtaNanumfC4z0NFei/GvwG3hPxI2pWNuw0zUz5sZzwkxJLp1z6MPY47V5zX8jZvldbJsbUwWIXvRf3ro/mfrWDxUMbQjWpvRi0UUV5p1BRRRQAUUUUAFFFFABRRRQAUUUUAanhXXJPDXiTTteRWYWVwkrquMumfmUZ7lcj8a+043WZFkVgQwDAg5yK+F/5V9cfCHXG8QeANKuppA00EZtZMEHBjO0Zx0yADj0Ir9o8Isy5atfLpdUpr8n+h8Xxbhfdp4len6r9TJ+P3h9tZ8ByXcKqZtKmW6+6MlMFXGSeBht3vtAr5er7c1zTbfWNJu9JuhmO7geFsqDjcCM4PHFfFeoWNxpd9c6beR7J7SZ4JVzna6kgjI4OCO1cni1lnssdRx8VpONn6x2/B/ga8JYnmozw76O69GV6KKK/Ij68KKKKACiiigAr0P4C6a2o/Ea0l2xtHYwTXMgbrjbsGOOoZ1/KvPK9q/Zl0+J9W1rVHgYyQ28UEcnOAHYl164Jyif5NfVcE4X63n+FpvZS5v/AAFN/oeTndX2OAqS8rffofQGNvTvXHfF3Um0r4d67cLCJPMthbbd2P8AWsI8/hvzjviuy/pXk37SF5FF4NtbMzFZJ75GVefmVVYnP5jr/Sv6S4oxP1LJsTWW6g/ysfnGW0vbYynDu0fNtFFFfyGfroUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFT2NlcalewafZxmSe5kWKNR3ZjgfzqCvbv2ffAC3Eh8d6lCSsLtFp6nPLDKvJ6Ecso9w3oK97hvI6vEGYU8HTWl7yfaK3PPzLHRy/DyrS36evQ9a8A+E7fwZ4ZstDibfLGu+4k/56Sty56DjPA9gOvWuk201e2OKkr+tcLhqeDoQw9FWjFJJeSPyepUlVm5z1b1EpaKK6CAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA86/Zz/wCTfPhh/wBibov/AKQw16LXnX7Of/Jvnww/7E3Rf/SGGvRaACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigApKWigDA8Y+FtP8Y6FdaFqS/JMMxuPvRyDlWBxwc/oSO9fHut6LfeHdYu9F1KEx3NnIY3GCAfQjIGQRyD3BBr7fK15N8cvh03iTTR4m0uMf2hpsLeYgRmaeEc7RjuvJHHOTX5l4jcK/wBsYT6/ho/vqa+co9V8t18z6Th3NfqVX2NV+5L8GfNlFFFfzk1Y/RgooopDCiiigAooooAKKKKACiiigAr279mnxF5NzqfhiZsJKovIQT0YYV+Mdxs5z2HFeI10HgDxE3hXxfpmtbsRRzCO464MTfK/AIyQCSMnAIB7V9Hwlmn9j5xQxL+G9n6PRnm5vhPrmDnT62uvkfZJw1fLfx80f+y/iFPcKoC6lDHcjnOT9w/qvT/GvqKGSOWNZI2DKwDKw6EHoRXl/wC0N4eGqeDU1aONTNpUwk3YGRG/ysOT0ztPfoK/fvEHKv7VyKo4ayp++vlv+B8Bw/ivqmOjzbS0+8+Z6WkFLX8vH6gFFFFAwooooAK+iv2a7F4fC+o3zMuy4vdiqOo2IM5/76H618619S/AOwjtfhvY3EbOWvJ55pASMAiRo8D0GEH61+k+FmH9rnvtOkYSf5I+a4qqcmBUe8l+p6P/AFrwj9py8kX+wtPCrsfzpt2DkEbQB+te75r5u/aUvJ5PGGnWLMPJg08SouOjPI4bnr0Rfyr9W8R6/seHav8AecV+Kf6HyvDsOfMIeV/yPJKKKK/mA/TwooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAoop9vb3F3NHa2sMk0srBEjjUszE8AADkmqjFzajHVsTaS5nsb/gHwbdeN/Elto8OVgBEl1L/AHIQw3YOCNx6DPfFfYOlafaaTptvptjCsVvbRiKNFHAUcCuP+E/gKHwR4bSO4hQaneBZb1h13c7Y8gkELkjjg8nvXdLwtf07wFwwuH8AqlZfvqiTl5LpH/PzPzHPcz/tDEcsPgjov1YtFFFfeHhhRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAedfs5/8m+fDD/sTdF/9IYa9Frzr9nP/k3z4Yf9ibov/pDDXotABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFMkUbelPpG6UAfNfxv+GUuhahL4q0S1ZtNvGL3QVifs8zEknGOEJOR1AORgDAryavuDVdNstYsJtM1K1S4trhSksbjIYf5/KvlH4nfDy+8B606CGQ6VcuTZzFtwI67GOB8w9+vvzX89+IvBzy6q80wUf3Un7yX2W+vo/zPv8Ah3OPbwWErv3lt5rt6nG0UlLX5QfWBRRRQAUUUUAFFFFABRRRQAUUUUwPrL4NeKf+Ep8D2bTFjdafiznLNuLFANr5yScrjk45zXVa1pdrrWl3mk3gPk3kD28m3rtZSDg468/mK+e/2efFX9leJJ/Dt3MqW2qR5iDD/l4X7oznjK7h7kLivpJfuj3r+qODM0hn+RU5VHdpckvlp+KPyvOcK8DjpRjonqvmfEOtaXPour3mk3GfMs53hYlcZ2nGcds8VTr139ovwyNP8Q2vieHd5epx+XMD0WWMAA5z3XHGP4evNeRV/OPEWVSyXNK2DltF6ej1X4H6NluLWOwsK3VrX16hRRRXiHcFFFFABX2B8K9Pg0v4e6DbW+4q9mlwdxz80v7xvwy5x+FfH9fafhGwOmeFdI0/zPM+zWMEW7bjdtjAzjPHSv1/whpXxuIq22il97Pj+L52o04ebNivlX49XlxdfEq/hnk3JaQwQwjaBtQxh8cdfmdjz619UsOgr5E+L19/aHxG1uby9myZYcbs/cRUz077c/jX1fixV5MmpwvvUX5S/wCAeVwrG+NlK20X+aOQooor+dT9FCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKSgQV7z8A/hoqxx+ONctgzSDOmxvnKjkGUj1P8Ptz3Bri/g/8ADNvG+pNqmoFk0mwkAkGP9e+AfLBPAHTd7Ecc5H1JDGsYWONQqqMADsO1fsvhtwf7aazjHR91fAn1f83p2+8+N4kziy+p0H/if6f5jsCniilr91sfDhRRRTAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDzr9nP/AJN8+GH/AGJui/8ApDDXotedfs5/8m+fDD/sTdF/9IYa9FoAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigApDS0UAN21j+KvC+m+L9FutC1ZSYbheGU4aNhyrKfUHn07HIJraph+8elY16FPE0pUasbxkrNPqmXCcqclKLs0fGnjjwTr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7jAPOO2+GvwFjh2ax45iWSQg+Xp38Ke8jA/MevyjjpnPSvb4Y441EccaqqjAAHAr9j4P8NZV+XG5wrR3UOr/AMXZeX3nxuccSKN6ODfrL/L/ADKWj6Npuh6fFpmk2aWttCoVEQdMDHJ6k+pPJrRHSk2qKdX7lSpxoxVOCSS2S0R8RKTk+aW4UUUVoIKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDzr9nP8A5N8+GH/Ym6L/AOkMNei151+zn/yb58MP+xN0X/0hhr0WgAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAprDNOooAyPEHhfRfFFm2n65p0V1Aw43cMvT7rDlenY188ePvgTr3hpZ9U0Fm1LTYsuy8efEvJ5X+IAAcj1J2gV9PVGwyNpxXy/EPCWXcR07YmNp9JLf/g/M9LL81xGXSvSenbofCzKysVdSrDgg9R+FJmvrLx18I/C/jRfOkhFhfg5F1booLdPvjHz9OM8ivn/AMbfCnxT4JmeS5tze2HJW8t1YoBzjeP4DgZ9Oepr8E4i4DzPIW6iXtKX80V+a3X5eZ95l2f4XHJRb5Z9n+hxtFJS18Oe6FFFFABU1jeXWnXkN/ZTNFPbyLJHIOqsDkGoaKqE5U5KcHZrW5MoqStLY+xPh34yt/G3he01gSRi5wI7uNMgRzADcMHkA5BHXgjmpPHfhG18beG7nQ7olGfEkEoxmOVeVbnt2PfBPTqPnL4QePm8E+JFhu5caXqTJFdAgYQ5wkmT0C7jn2z1IFfVcU0dxGskLh0cBlZTkEHkEHvX9QcKZ3Q4uyd0sRZzS5Zrvpv8z8vzXA1MpxfNT2esX/XY+IL+xu9MvZtPvoWhnt3MciMpBUg+h5qCve/2hPACzWw8c6bCPNi2xXyov306LIeedvyr06EdhXgn9K/n7ifIavD2YzwlTWO8X3i9v8mfoOV4+OY4dVo77P1A9K+39G40iy/694//AEEV8QV9q+Er7+0vCuj6h5fl/abGCbZnO3cgOM96/RfCCcfbYqHW0fzZ85xeny0n6/oawOOtfHXxMP8AxcDXv+v6T+dfYjLnFfJPxksYbD4la1DDu2vJHMdx/ieNWP6sa9/xbpuWVUZ9FP8ANP8AyOHhOVsZKP8Ad/VHF0UUV/PR+hBRRRQAUUUUAFFFFABRRSUALRkVf0XQdX8Ragmm6LYS3Vw5xtReF92J4Ue5r3HwL+zzp9osd/40mW8nOGFnCxESHnhmGC/GDgYGcj5h1+kyHhTM+IanLhadodZPSK+fX0R5mPzbDZfH95K77Lc8p8EfDfxJ46uP+JbbeVZI2JbyXiNeD07seP4enGcV9JeBvhj4e8C2y/YIPtF6VIlvJlHmNnGQP7q8cAfiT1rqre1hto1ht4Y4o04VEUAD8BU6jAxX7/wzwLl/DqVVr2lb+Zrb/Cun5nwOZ55iMxfL8MOy/UbtNKowTTqK+4PFCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDzr9nP/AJN8+GH/AGJui/8ApDDXotedfs5/8m+fDD/sTdF/9IYa9FoAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACk20tFADdoNJ5antxT6KTSejA8w8XfAvwf4i8yfTIRo12SMPbRjyj9Y8gdPTHb3z4n4q+EPjfwnDJeXWn/a7SPcXntMuqqBkswxuUYzyRgY5r64P0pGXjp1r4bPfD7KM6bqRj7Oo+sf1Wz/AAPbwOf4zBe7fmj2f+e58K0lfXHir4R+DPFiE3Wl/ZLn+G5s8RSDnJ4wVbPI+ZT1PfmvIPEv7O3irTVM3h+6h1WMt/qyRDKBxj7x2nv37V+P5z4b5xld5UY+2h3jv81v91z6/BcSYPFaVPcfnt96/U8noqxf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Guz0f4H/ABE1h1DaTHYRsSDJeShAuBnkLluemQK+rIbWC3jSGCJI441CoqrgKB0AHYVJs96+wwHhJgaVnjK0p+i5V+rPJr8W4if8GCj+P+R4loP7NWmwxpJ4l1ya4lK/PHajYgOBkbiCTg55wO3Ar0bw58OfB3hVduj6HbJIfvTSr5kp4GfmbJA+UHAwM9q6fbRtr7vLOFsoyizwtCKa6vV/e/0PCxOZ4zF/xqja7dPuBF2qBTqKK99KxwBRRRTAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPOv2c/+TfPhh/2Jui/+kMNei151+zn/AMm+fDD/ALE3Rf8A0hhr0WgAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigApDS0UANoAFOopWASjaBS0UwEIzTSvtT6KVgEHSloopgFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB51+zn/AMm+fDD/ALE3Rf8A0hhr0WvOv2c/+TfPhh/2Jui/+kMNei0AFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRR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FFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAHnX7Of/Jvnww/7E3Rf/SGGvRa86/Zz/5N8+GH/Ym6L/6Qw16LQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAedfs5/wDJvnww/wCxN0X/ANIYa9Frzr9nP/k3z4Yf9ibov/pDDXotABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB51+zn/wAm+fDD/sTdF/8ASGGvRaKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD/2Q==";
            doc.addImage(logoBase64, "JPEG", 10, 0, 30, 22);
            
            // Add header text
            doc.setFontSize(24);
            doc.setFont('bold');
            doc.text("Customer Due Diligence Report", 50, 15);
            doc.setLineWidth(0.5);
            doc.line(50, 18, 160, 18);
            // Set font size for the rest of the content
            doc.setFontSize(10);

            // Add summary data as a table
            const summaryTableData = [
                ["GSTIN", items[0].gstin || "N/A", "STATUS", items[0].return_status || "N/A"],
                ["LEGAL NAME", items[0].legal_name || "N/A", "REG. DATE", items[0].registration_date || "N/A"],
                ["TRADE NAME", items[0].trade_name || "N/A", "LAST UPDATE DATE", items[0].last_update || "N/A"],
                ["COMPANY TYPE", items[0].company_type || "N/A", "STATE", items[0].state || "N/A"],
                ["% DELAYED FILLING", items[0].delayed_filling || "N/A", "AVG. DELAY DAYS", items[0].Delay_days || "N/A"],
                ["Address", items[0].address || "N/A", "Result", items[0].result || "N/A"],
            ];

            doc.autoTable({
                startY: 20,
                head: [["", "", "", ""]],
                body: summaryTableData,
                theme: "grid",
                headStyles: { fillColor: [230, 230, 230] },
                styles: { fontSize: 10, cellPadding: 3, textColor: [0, 0, 0] },
                columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 70 }, 2: { cellWidth: 45 }, 3: { cellWidth: 30 } },
            });

            // Get the Y position for the next table
            let yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : 20;

            // Sorting logic for all items
            items.sort((a, b) => {
                const yearA = parseInt(a.year || "0", 10);
                const yearB = parseInt(b.year || "0", 10);
                const monthA = parseInt(a.month || "0", 10);
                const monthB = parseInt(b.month || "0", 10);

                if (yearA > yearB) return -1;
                if (yearA < yearB) return 1;
                if (monthA > monthB) return -1;
                if (monthA < monthB) return 1;

                return 0;
            });

            if (items.length > 24) {
                items.splice(24);
            }
            // Prepare sorted data for tables
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const prepareTableData = (records: any[]) =>
                records.map((item) => [
                    item.year || "N/A",
                    getMonthName(item.month || "N/A"),
                    item.return_type || "N/A",
                    item.date_of_filing || "N/A",
                    item.delayed_filling || "N/A",
                    item.Delay_days || "N/A",
                ]);

            // Separate GSTR3B and other records
            const gstr3bRecords = items.filter((item) => item.return_type === "GSTR3B");
            const otherRecords = items.filter((item) => item.return_type !== "GSTR3B");

            // Prepare table data
            const gstr3bTableData = prepareTableData(gstr3bRecords);
            const otherTableData = prepareTableData(otherRecords);

            // Add GSTR3B records table
            if (gstr3bTableData.length > 0) {


                doc.autoTable({
                    startY: yPos,
                    head: [["Year", "Month", "Return Type", "Date of Filing", "Delayed Filing", "Delay Days"]],
                    body: gstr3bTableData,
                    theme: "grid",
                    headStyles: { fillColor: [230, 230, 230] },
                    styles: { fontSize: 10, cellPadding: 4.7, textColor: [0, 0, 0] },
                    columnStyles: {
                        0: { cellWidth: 30 },
                        1: { cellWidth: 30 },
                        2: { cellWidth: 30 },
                        3: { cellWidth: 35 },
                        4: { cellWidth: 35 },
                        5: { cellWidth: 30 },
                    },
                });

                yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 20 : 30;

            }

            // Add Other records table
            if (otherTableData.length > 0) {
                doc.setFontSize(20);
                doc.text("Other Records", 80, yPos - 5);
                doc.autoTable({
                    startY: yPos,
                    head: [["Year", "Month", "Return Type", "Date of Filing", "Delayed Filing", "Delay Days"]],
                    body: otherTableData,
                    theme: "grid",
                    headStyles: { fillColor: [230, 230, 230] },
                    styles: { fontSize: 10, cellPadding: 3, textColor: [0, 0, 0] },
                    columnStyles: {
                        0: { cellWidth: 30 },
                        1: { cellWidth: 30 },
                        2: { cellWidth: 30 },
                        3: { cellWidth: 35 },
                        4: { cellWidth: 35 },
                        5: { cellWidth: 30 },
                    },
                });
            }

            // Save the PDF
            doc.save(`${gstin}_summary.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

    // const handlePageChange = (page: number) => {
    //     setCurrentPage(page)
    // }

    const sortData = (data: CompanyData[]) => {
        if (!sortConfig || !sortConfig.key) return data;
        return [...data].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue === undefined && bValue === undefined) return 0;
            if (aValue === undefined) return 1;
            if (bValue === undefined) return -1;

            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    };

    const handleSort = (key: keyof CompanyData) => {
        setSortConfig(prevConfig => {
            if (!prevConfig || prevConfig.key !== key) {
                return { key, direction: 'ascending' };
            }
            if (prevConfig.direction === 'ascending') {
                return { key, direction: 'descending' };
            }
            return null;
        });
    };

    if (!isAuthenticated || !isAdmin) {
        return <div>Loading...</div>
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <form onSubmit={handleSearch} className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by GSTIN"
                            // className="flex-grow"
                            className={`flex-grow p-2 border ${error ? "border-red-500" : "border-gray-300"
                                } rounded-md`}
                        />
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <img src="/gif/loading.gif" alt="Loading..." className="w-6 h-6" />
                            ) : (
                                "Add/update Company"
                            )}
                        </Button>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Input
                            type="text"
                            value={filters.legal_name}
                            onChange={(e) => handleFilterChange('legal_name', e.target.value)}
                            placeholder="Legal Name"
                        />
                        <Input
                            type="text"
                            value={filters.gstin}
                            onChange={(e) => handleFilterChange('gstin', e.target.value)}
                            placeholder="GSTIN"
                        />
                        <Input
                            type="text"
                            value={filters.state}
                            onChange={(e) => handleFilterChange('state', e.target.value)}
                            placeholder="State"
                        />
                        <Select
                            value={filters.status}
                            onValueChange={(value) => handleFilterChange('status', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="Pass">Pass</SelectItem>
                                <SelectItem value="Fail">Fail</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </form>
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead onClick={() => handleSort('legal_name')} className="cursor-pointer">
                                <div className="flex items-center">
                                    Company Name
                                    {sortConfig?.key === 'legal_name'
                                        ? (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)
                                        : <ArrowUpDown className="ml-2 h-4 w-4" />
                                    }
                                </div>
                            </TableHead>
                            <TableHead onClick={() => handleSort('gstin')} className="cursor-pointer">
                                <div className="flex items-center">
                                    GSTIN
                                    {sortConfig?.key === 'gstin'
                                        ? (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)
                                        : <ArrowUpDown className="ml-2 h-4 w-4" />
                                    }
                                </div>
                            </TableHead>
                            <TableHead onClick={() => handleSort('state')} className="cursor-pointer">
                                <div className="flex items-center">
                                    State
                                    {sortConfig?.key === 'state'
                                        ? (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)
                                        : <ArrowUpDown className="ml-2 h-4 w-4" />
                                    }
                                </div>
                            </TableHead>
                            <TableHead onClick={() => handleSort('fetch_date')} className="cursor-pointer">
                                <div className="flex items-center">
                                    Fetch Date
                                    {sortConfig?.key === 'fetch_date'
                                        ? (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)
                                        : <ArrowUpDown className="ml-2 h-4 w-4" />
                                    }
                                </div>
                            </TableHead>
                            <TableHead onClick={() => handleSort('annual_turnover')} className="cursor-pointer">
                                <div className="flex items-center">
                                    Annual Turnover (Cr.)
                                    {sortConfig?.key === 'annual_turnover'
                                        ? (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)
                                        : <ArrowUpDown className="ml-2 h-4 w-4" />
                                    }
                                </div>
                            </TableHead>
                            <TableHead onClick={() => handleSort('result')} className="cursor-pointer">
                                <div className="flex items-center">
                                    Status
                                    {sortConfig?.key === 'result'
                                        ? (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)
                                        : <ArrowUpDown className="ml-2 h-4 w-4" />
                                    }
                                </div>
                            </TableHead>
                            <TableHead>Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayData
                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                            .map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.legal_name}</TableCell>
                                    <TableCell>{item.gstin}</TableCell>
                                    <TableCell>{item.state || ''}</TableCell>
                                    <TableCell>{item.fetch_date}</TableCell>
                                    <TableCell>{item.annual_turnover || ''}</TableCell>
                                    <TableCell>{item.result || 'Hold'}</TableCell>
                                    <TableCell>
                                        <Button variant="outline" size="sm" onClick={() => generatePDF(item.gstin || '')} className="mr-2" type="submit" disabled={isLoading}>
                                            {isLoading ? (
                                                <img src="/gif/loading.gif" alt="Loading..." className="w-16 h-6" />
                                            ) : (
                                                "Download"
                                            )}
                                        </Button>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" onClick={() => setEditingId(item.id || null)} size="sm">Edit</Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[425px]">
                                                <DialogHeader>
                                                    <DialogTitle>Edit Company Details</DialogTitle>
                                                </DialogHeader>
                                                <div className="grid gap-4 py-4">
                                                    {/* <div className="grid grid-cols-4 items-center gap-4">
                                                        <label htmlFor="status" className="text-right">
                                                            Status
                                                        </label>
                                                        <Select onValueChange={handleStatusChange} defaultValue={item.result}>
                                                            <SelectTrigger className="col-span-3">
                                                                <SelectValue placeholder="Select status" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Pass">Pass</SelectItem>
                                                                <SelectItem value="Fail">Fail</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div> */}
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <label htmlFor="annual_turnover" className="text-right">
                                                            Annual Turnover (Cr.)
                                                        </label>
                                                        <Input
                                                            id="annual_turnover"
                                                            className="col-span-3"
                                                            defaultValue={item.annual_turnover?.toString()}
                                                            onChange={(e) => handleAnnualTurnoverChange(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex justify-end space-x-4">
                                                    <Button type="submit" disabled={isLoading} onClick={handleSaveChanges}>
                                                        {isLoading ? (
                                                            <img src="/gif/loading.gif" alt="Loading..." className="w-6 h-6" />
                                                        ) : (
                                                            "Save Changes"
                                                        )}
                                                    </Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </div>

            <div className="mt-4 flex justify-center space-x-2">
                <Button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>
                    Previous
                </Button>
                {Array.from({ length: Math.ceil(displayData.length / itemsPerPage) }).map((_, index) => (
                    <Button
                        key={index}
                        variant={currentPage === index + 1 ? "default" : "outline"}
                        onClick={() => paginate(index + 1)}
                    >
                        {index + 1}
                    </Button>
                ))}
                <Button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === Math.ceil(displayData.length / itemsPerPage)}
                >
                    Next
                </Button>
            </div>
        </div>
    )
}
