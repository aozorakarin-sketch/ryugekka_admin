"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// ダミーデータ（後でSupabaseから取得するように変更）
const dummyConsultations = [
  {
    id: "1",
    date: "2026/04/15 16:10:29",
    userName: "カワチサキ",
    teacherName: "雲龍蓮",
    duration: 21,
    price: 1764,
    status: "completed",
  },
  {
    id: "2",
    date: "2026/04/15 04:15:26",
    userName: "笠原 智子",
    teacherName: "椎名架月",
    duration: 13,
    price: 1092,
    status: "completed",
  },
  {
    id: "3",
    date: "2026/04/15 01:18:28",
    userName: "ナガオサユリ",
    teacherName: "青空花林",
    duration: 13,
    price: 1092,
    status: "completed",
  },
  {
    id: "4",
    date: "2026/04/14 04:43:27",
    userName: "ハシモトコマ",
    teacherName: "雲龍蓮",
    duration: 27,
    price: 2268,
    status: "completed",
  },
]

export default function ConsultationsPage() {
  const [consultations] = useState(dummyConsultations)

  const formatPrice = (price: number) => {
    return `¥${price.toLocaleString()}`
  }

  const totalSales = consultations.reduce((sum, c) => sum + c.price, 0)
  const avgDuration = Math.round(consultations.reduce((sum, c) => sum + c.duration, 0) / consultations.length)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">鑑定履歴</h1>
        <p className="text-gray-600 dark:text-gray-400">過去の鑑定一覧です</p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">総鑑定数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{consultations.length}件</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">総売上</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPrice(totalSales)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">平均時間</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{avgDuration}分</p>
          </CardContent>
        </Card>
      </div>

      {/* 一覧テーブル */}
      <Card>
        <CardHeader>
          <CardTitle>鑑定一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日時</TableHead>
                  <TableHead>ユーザー</TableHead>
                  <TableHead>占い師</TableHead>
                  <TableHead>時間</TableHead>
                  <TableHead>金額</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consultations.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>{item.userName}</TableCell>
                    <TableCell>{item.teacherName}</TableCell>
                    <TableCell>{item.duration}分</TableCell>
                    <TableCell>{formatPrice(item.price)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}